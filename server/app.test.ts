import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { buildApp, type AppConfig } from './app.js';
import { HomeAssistant, mapEntity } from './home-assistant.js';
import { Store } from './store.js';
import type { Device, HomeSnapshot } from '../shared/types.js';

function fixture(t: TestContext, config: Partial<AppConfig> = {}) {
  const built = buildApp({ databasePath: ':memory:', staticRoot: false, ...config });
  t.after(() => built.app.close());
  return built;
}
const command = (deviceId: string, changes: object) => ({ method: 'POST' as const, url: '/api/control', payload: { deviceId, changes } });
const haEntity = (state = 'on') => ({ entity_id: 'light.desk', state, attributes: { friendly_name: '真实灯', supported_color_modes: ['brightness'], brightness: 127 }, last_updated: '2026-11-09T08:00:00Z' });

test('fresh home has isolated demo devices and no invented operation history', async (t) => {
  const { app } = fixture(t);
  const response = await app.inject('/api/home');
  assert.equal(response.statusCode, 200);
  const home = response.json<HomeSnapshot>();
  assert.equal(home.devices.length, 9);
  assert.ok(home.devices.every((d) => d.adapter === 'demo'));
  assert.equal(home.events.length, 0);
  assert.equal(home.agent.mode, 'local');
});

test('manual power and brightness update both state and successful audit events', async (t) => {
  const { app } = fixture(t);
  assert.equal((await app.inject(command('living-light', { power: false }))).statusCode, 200);
  const result = await app.inject(command('living-light', { brightness: 32 }));
  assert.equal(result.json<Device>().state.brightness, 32);
  assert.equal(result.json<Device>().state.power, true);
  const home = (await app.inject('/api/home')).json<HomeSnapshot>();
  assert.equal(home.events.length, 2);
  assert.ok(home.events.every((e) => e.status === 'success' && e.source === 'manual'));
});

test('invalid, unsupported, conflicting and offline controls cannot change devices', async (t) => {
  const { app, store } = fixture(t);
  const before = store.devices();
  for (const [id, changes] of [
    ['living-light', { brightness: 101 }], ['living-light', { brightness: -1 }], ['living-light', { power: 'true' }],
    ['living-light', { temperature: 24 }], ['living-light', {}], ['living-light', { power: false, brightness: 40 }],
    ['living-ac', { temperature: 31 }], ['living-sensor', { power: true }], ['living-light', { unlock: true }],
  ] as [string, object][]) assert.equal((await app.inject(command(id, changes))).statusCode, 400);
  assert.equal((await app.inject(command('missing', { power: true }))).statusCode, 404);
  assert.deepEqual(store.devices(), before);
  const light = store.get<Device>('devices', 'living-light')!;
  store.put('devices', { ...light, online: false });
  assert.equal((await app.inject(command(light.id, { power: false }))).statusCode, 409);
  assert.deepEqual(store.get<Device>('devices', light.id)?.state, light.state);
});

test('scenes preflight all actions before executing and retain truthful partial outcomes', async (t) => {
  const ha = new HomeAssistant('http://ha.test', 'fixture', async () => { throw new Error('network'); });
  const { app, store } = fixture(t, { ha });
  const real = mapEntity(haEntity())!;
  store.put('devices', real);
  store.put('scenes', { id: 'preflight', name: '拒绝', actions: [{ deviceId: 'living-light', changes: { power: false } }, { deviceId: 'absent', changes: { power: true } }] });
  assert.equal((await app.inject({ method: 'POST', url: '/api/scenes/preflight/run' })).statusCode, 404);
  assert.equal(store.get<Device>('devices', 'living-light')!.state.power, true);
  assert.equal(store.list('events').length, 0);
  store.put('scenes', { id: 'partial', name: '部分失败', actions: [{ deviceId: 'living-light', changes: { power: false } }, { deviceId: real.id, changes: { power: false } }, { deviceId: 'study-light', changes: { power: false } }] });
  const result = await app.inject({ method: 'POST', url: '/api/scenes/partial/run' });
  assert.equal(result.json().status, 'partial');
  assert.equal(result.json().results.length, 2);
  assert.equal(store.get<Device>('devices', 'living-light')!.state.power, false);
  assert.equal(store.get<Device>('devices', 'study-light')!.state.power, true);
  assert.equal(store.list<{ status: string }>('events')[1].status, 'uncertain');
});

test('demo state, scene, room and chat survive restart without reseeding', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'home-hub-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const path = join(folder, 'home.sqlite');
  const first = buildApp({ databasePath: path });
  try {
    await first.app.inject(command('living-light', { brightness: 22 }));
    await first.app.inject({ method: 'PATCH', url: '/api/devices/living-light', payload: { room: '阅读角' } });
    await first.app.inject({ method: 'POST', url: '/api/chat', payload: { message: '查看家里状态' } });
    await first.app.inject({ method: 'POST', url: '/api/scenes', payload: { name: '阅读', actions: [{ deviceId: 'living-light', changes: { brightness: 22 } }] } });
  } finally { await first.app.close(); }
  const second = fixture(t, { databasePath: path });
  const home = (await second.app.inject('/api/home')).json<HomeSnapshot>();
  assert.equal(home.devices.length, 9);
  assert.equal(home.devices.find((d) => d.id === 'living-light')!.state.brightness, 22);
  assert.equal(home.devices.find((d) => d.id === 'living-light')!.room, '阅读角');
  assert.equal(home.scenes.length, 4);
  assert.equal(home.messages.length, 2);
});

test('interrupted durable commands become uncertain on restart', (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'home-hub-audit-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const path = join(folder, 'home.sqlite');
  const first = new Store(path, false);
  first.event('manual', '灯', 'pending', '打开'); first.close();
  const second = new Store(path, false);
  try { assert.equal(second.list<{ status: string }>('events')[0].status, 'uncertain'); } finally { second.close(); }
});

test('local commands execute exact instructions and decline ambiguous or negative language', async (t) => {
  const { app, store } = fixture(t);
  for (const message of ['不要关闭客厅主灯', '关闭客厅主灯吗？', '关闭客厅主灯，然后打开卧室床头灯', '我想关掉客厅的灯', '打开灯']) {
    const result = await app.inject({ method: 'POST', url: '/api/chat', payload: { message } });
    assert.equal(result.statusCode, 200);
    assert.equal(store.list('events').length, 0);
  }
  const result = await app.inject({ method: 'POST', url: '/api/chat', payload: { message: '客厅空调调到26度' } });
  assert.match(result.json().content, /已调整/);
  await app.inject({ method: 'POST', url: '/api/chat', payload: { message: '关闭所有灯' } });
  assert.ok(store.devices().filter((d) => d.kind === 'light').every((d) => !d.state.power));
  const scene = await app.inject({ method: 'POST', url: '/api/chat', payload: { message: '观影模式' } });
  assert.match(scene.json().content, /已执行/);
  assert.equal(store.get<Device>('devices', 'living-light')!.state.brightness, 20);
  assert.equal(store.get<Device>('devices', 'living-curtain')!.state.position, 0);
});

test('API authentication, origin and host checks reject unauthorised clients', async (t) => {
  const { app } = fixture(t, { apiToken: 'test-only-token' });
  assert.equal((await app.inject('/api/home')).statusCode, 401);
  assert.equal((await app.inject({ ...command('living-light', { power: false }), headers: { authorization: 'Bearer invalid' } })).statusCode, 401);
  assert.equal((await app.inject({ url: '/api/home', headers: { authorization: 'Bearer test-only-token' } })).statusCode, 200);
  assert.equal((await app.inject({ ...command('living-light', { power: false }), headers: { authorization: 'Bearer test-only-token', origin: 'https://untrusted.example' } })).statusCode, 403);
  for (const path of ['/%61pi/home', '/api%2Fhome', '//api/home']) {
    assert.notEqual((await app.inject(path)).statusCode, 200, path);
  }
  const local = fixture(t);
  assert.equal((await local.app.inject({ url: '/api/home', headers: { host: 'attacker.example' } })).statusCode, 403);
});

test('demo disabled starts empty and cannot add simulated devices', async (t) => {
  const { app } = fixture(t, { demo: false });
  assert.equal((await app.inject('/api/home')).json<HomeSnapshot>().devices.length, 0);
  assert.equal((await app.inject({ method: 'POST', url: '/api/devices', payload: { name: '测试', room: '书房', kind: 'light' } })).statusCode, 409);
});

test('static SPA fallback cannot turn encoded API paths into unauthenticated pages', async (t) => {
  const folder = mkdtempSync(join(tmpdir(), 'home-hub-static-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  writeFileSync(join(folder, 'index.html'), '<!doctype html><title>Home Hub</title>');
  const { app } = fixture(t, { staticRoot: folder, apiToken: 'static-fixture' });
  assert.equal((await app.inject('/')).statusCode, 200);
  for (const url of ['/api/missing', '/%61pi/home', '/api%2Fhome', '//api/home']) {
    assert.equal((await app.inject(url)).statusCode, 401);
  }
  const result = await app.inject({ url: '/api%2Fmissing', headers: { authorization: 'Bearer static-fixture' } });
  assert.equal(result.statusCode, 404);
  assert.equal(result.json().error, 'NOT_FOUND');
});

test('new device and saved scene use the same validated control path', async (t) => {
  const { app } = fixture(t);
  const added = await app.inject({ method: 'POST', url: '/api/devices', payload: { name: '阅读灯', room: '书房', kind: 'light' } });
  assert.equal(added.statusCode, 201);
  const id = added.json<Device>().id;
  const saved = await app.inject({ method: 'POST', url: '/api/scenes', payload: { name: '专注', actions: [{ deviceId: id, changes: { brightness: 48 } }] } });
  assert.equal(saved.statusCode, 201);
  await app.inject({ method: 'POST', url: `/api/scenes/${saved.json().id}/run` });
  assert.equal((await app.inject('/api/home')).json<HomeSnapshot>().devices.find((d) => d.id === id)!.state.brightness, 48);
});

test('HA mapping only exposes supported capabilities and preserves offline state', () => {
  assert.equal(mapEntity({ ...haEntity(), entity_id: 'lock.front' }), null);
  const off = mapEntity({ ...haEntity(), state: 'unavailable' })!;
  assert.equal(off.online, false);
  assert.deepEqual(mapEntity({ ...haEntity(), attributes: { supported_color_modes: ['onoff'] } })!.capabilities, ['power']);
  const climate = mapEntity({ ...haEntity(), entity_id: 'climate.living', attributes: { supported_features: 1, min_temp: 18, max_temp: 28 } })!;
  assert.deepEqual(climate.capabilities, ['temperature']);
  assert.deepEqual(climate.temperatureRange, [18, 28]);
});

test('HA control calls services and reads the device back instead of fabricating target state', async (t) => {
  let state = haEntity();
  const requests: string[] = [];
  const ha = new HomeAssistant('http://ha.test', 'not-a-real-token', async (url, options) => {
    const path = String(url).replace('http://ha.test', ''); requests.push(`${options?.method} ${path}`);
    assert.equal((options?.headers as Record<string, string>).Authorization, 'Bearer not-a-real-token');
    if (path === '/api/states') return Response.json([state]);
    if (path === '/api/services/light/turn_off') { state = haEntity('off'); return Response.json([state]); }
    if (path === '/api/states/light.desk') return Response.json(state);
    throw new Error('unexpected path');
  });
  const { app } = fixture(t, { ha });
  assert.equal((await app.inject({ method: 'POST', url: '/api/connections/home-assistant/sync' })).statusCode, 200);
  const response = await app.inject(command('ha:light.desk', { power: false }));
  assert.equal(response.statusCode, 200);
  assert.equal(response.json<Device>().state.power, false);
  assert.deepEqual(requests, ['GET /api/states', 'POST /api/services/light/turn_off', 'GET /api/states/light.desk']);
});

test('HA delayed state remains observed state with uncertain outcome, never automatic retry', async (t) => {
  let posts = 0;
  const ha = new HomeAssistant('http://ha.test', 'fixture', async (url, options) => {
    if (options?.method === 'POST') { posts++; return Response.json([]); }
    return Response.json(String(url).endsWith('/states') ? [haEntity()] : haEntity());
  });
  const { app, store } = fixture(t, { ha });
  await app.inject({ method: 'POST', url: '/api/connections/home-assistant/sync' });
  assert.equal((await app.inject(command('ha:light.desk', { power: false }))).statusCode, 502);
  assert.equal(store.get<Device>('devices', 'ha:light.desk')!.state.power, true);
  assert.equal(store.list<{ status: string }>('events')[0].status, 'uncertain');
  assert.equal(posts, 1);
});

test('HA sync failures mark cached devices unavailable and never disclose secrets', async (t) => {
  let fail = false;
  const ha = new HomeAssistant('http://ha.test', 'secret-fixture', async () => fail ? new Response('secret-fixture', { status: 401 }) : Response.json([haEntity()]));
  const { app, store } = fixture(t, { ha });
  await app.inject({ method: 'POST', url: '/api/connections/home-assistant/sync' });
  fail = true;
  const result = await app.inject({ method: 'POST', url: '/api/connections/home-assistant/sync' });
  assert.equal(result.statusCode, 502);
  assert.equal(store.get<Device>('devices', 'ha:light.desk')!.online, false);
  assert.ok(!(await app.inject('/api/home')).body.includes('secret-fixture'));
});

test('concurrent commands are serialized without lost updates', async (t) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let started!: () => void;
  const entered = new Promise<void>((resolve) => { started = resolve; });
  let realState = haEntity();
  const ha = new HomeAssistant('http://ha.test', 'fixture', async (_url, options) => {
    if (options?.method === 'POST') { started(); await gate; realState = haEntity('off'); return Response.json([realState]); }
    return Response.json(realState);
  });
  const { hub, store } = fixture(t, { ha });
  store.put('devices', mapEntity(haEntity())!);
  const first = hub.control({ deviceId: 'ha:light.desk', changes: { power: false } });
  await entered;
  const second = hub.control({ deviceId: 'living-light', changes: { brightness: 42 } });
  assert.equal(store.get<Device>('devices', 'living-light')!.state.brightness, 70);
  release(); await Promise.all([first, second]);
  assert.equal(store.get<Device>('devices', 'living-light')!.state.brightness, 42);
  assert.equal(store.get<Device>('devices', 'ha:light.desk')!.state.power, false);
});

test('configured model uses actual tool calls and subsequent requests include tool results', async (t) => {
  let round = 0;
  const requests: { messages: Record<string, unknown>[] }[] = [];
  const toolCall = (name: string, args: object) => ({ content: null, tool_calls: [{ id: `call-${round}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }] });
  const { app, store } = fixture(t, { model: { apiKey: 'model-fixture', baseUrl: 'http://model.test/v1', model: 'test' }, modelFetch: async (_url, options) => {
    requests.push(JSON.parse(String(options?.body))); round++;
    return Response.json({ choices: [{ message: round === 1 ? toolCall('get_home', {}) : round === 2 ? toolCall('control_device', { deviceId: 'living-light', changes: { brightness: 30 } }) : { content: '客厅主灯已调到 30%。' } }] });
  } });
  const result = await app.inject({ method: 'POST', url: '/api/chat', payload: { message: '客厅稍微暗一点' } });
  assert.equal(round, 3);
  assert.equal(store.get<Device>('devices', 'living-light')!.state.brightness, 30);
  assert.equal(result.json().actions.length, 1);
  assert.ok(requests[2].messages.some((m) => m.role === 'tool' && String(m.content).includes('"brightness":30')));
  assert.ok(!(await app.inject('/api/home')).body.includes('model-fixture'));
});

test('model invalid tool call cannot bypass validation and stops further mutations', async (t) => {
  let calls = 0;
  const { app, store } = fixture(t, { model: { apiKey: 'fixture', baseUrl: 'http://model.test', model: 'test' }, modelFetch: async () => {
    calls++;
    return Response.json({ choices: [{ message: { tool_calls: [
      { id: 'bad', type: 'function', function: { name: 'control_device', arguments: JSON.stringify({ deviceId: 'living-light', changes: { brightness: 200 } }) } },
      { id: 'later', type: 'function', function: { name: 'control_device', arguments: JSON.stringify({ deviceId: 'study-light', changes: { power: false } }) } },
    ] } }] });
  } });
  await app.inject({ method: 'POST', url: '/api/chat', payload: { message: '测试' } });
  assert.equal(calls, 1);
  assert.equal(store.list('events').length, 0);
  assert.equal(store.get<Device>('devices', 'study-light')!.state.power, true);
});

test('MCP stdio client can discover tools and control the running HTTP service', async (t) => {
  const { app, store } = fixture(t, { apiToken: 'mcp-fixture' });
  const address = await app.listen({ host: '127.0.0.1', port: 0 });
  const transport = new StdioClientTransport({ command: process.execPath, args: ['--import', 'tsx', 'server/mcp.ts'], env: { HUB_URL: address, HUB_API_TOKEN: 'mcp-fixture' }, stderr: 'pipe' });
  const client = new Client({ name: 'home-hub-test', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(transport);
  assert.deepEqual((await client.listTools()).tools.map((tool) => tool.name), ['get_home', 'control_device', 'activate_scene']);
  const result = await client.callTool({ name: 'control_device', arguments: { deviceId: 'living-light', changes: { brightness: 17 } } });
  assert.notEqual(result.isError, true);
  assert.equal(store.get<Device>('devices', 'living-light')!.state.brightness, 17);
  const rejected = await client.callTool({ name: 'control_device', arguments: { deviceId: 'living-light', changes: { brightness: 101 } } });
  assert.equal(rejected.isError, true);
});
