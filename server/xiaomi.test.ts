import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './app.js';
import { HomeAssistant } from './home-assistant.js';
import type { Device, HomeSnapshot, XiaomiDiscovery } from '../shared/types.js';

const state = (entity_id: string, name: string, value = 'on', attributes: Record<string, unknown> = {}) => ({
  entity_id, state: value, attributes: { friendly_name: name, ...attributes }, last_updated: '2026-11-10T00:00:00Z',
});
function fixture(t: TestContext, apiToken?: string) {
  const remote = {
    states: [state('light.reading', '米家阅读灯', 'on', { supported_color_modes: ['brightness'], brightness: 127 }),
      state('cover.window', '米家窗帘', 'open', { supported_features: 4, current_position: 80 }),
      state('fan.living', '米家风扇'), state('light.unrelated', '小米名字的其他集成灯')],
    registry: ['light.reading', 'cover.window', 'fan.living', 'sensor.disabled'].map((entity_id) => ({ entity_id, area: '书房', manufacturer: 'Xiaomi', model: 'fixture.model' })),
    failure: '', calls: [] as string[], writes: 0,
  };
  const ha = new HomeAssistant('http://ha.test', 'xiaomi-secret-fixture', async (url, options) => {
    const path = new URL(String(url)).pathname;
    remote.calls.push(path);
    if (remote.failure === 'network') throw new Error('xiaomi-secret-fixture');
    if (remote.failure === '401' || remote.failure === '403') return new Response('xiaomi-secret-fixture', { status: Number(remote.failure) });
    if (path === '/api/template') {
      assert.match(JSON.parse(String(options?.body)).template, /integration_entities\('xiaomi_home'\)/);
      return new Response(remote.failure === 'malformed' ? 'xiaomi-secret-fixture' : JSON.stringify(remote.registry), { headers: { 'Content-Type': 'text/plain' } });
    }
    if (path === '/api/states') return Response.json(remote.states);
    if (path.startsWith('/api/services/')) {
      remote.writes++;
      const data = JSON.parse(String(options?.body));
      const entity = remote.states.find((item) => item.entity_id === data.entity_id)!;
      if (path.endsWith('/turn_off')) entity.state = 'off';
      if (path.endsWith('/turn_on')) { entity.state = 'on'; if (data.brightness_pct !== undefined) entity.attributes = { ...entity.attributes, brightness: Math.round(data.brightness_pct * 255 / 100) }; }
      if (path.endsWith('/set_cover_position')) entity.attributes = { ...entity.attributes, current_position: data.position };
      return Response.json([entity]);
    }
    const entity = remote.states.find((item) => path === `/api/states/${item.entity_id}`);
    if (entity) return Response.json(entity);
    throw new Error(`Unexpected fixture request: ${path}`);
  });
  const built = buildApp({ databasePath: ':memory:', demo: false, staticRoot: false, ha, apiToken });
  t.after(() => built.app.close());
  return { ...built, remote };
}
const post = (action: string, payload?: object) => ({ method: 'POST' as const, url: `/api/connections/xiaomi/${action}`, payload });

test('Xiaomi discovery uses integration membership, exposes provenance and leaves the home unchanged', async (t) => {
  const { app, store, remote } = fixture(t);
  const response = await app.inject(post('discover'));
  assert.equal(response.statusCode, 200);
  const discovery = response.json<XiaomiDiscovery>();
  assert.equal(discovery.total, 4);
  assert.deepEqual(discovery.devices.map((d) => d.entityId), ['light.reading', 'cover.window']);
  assert.equal(discovery.devices[0].room, '书房');
  assert.equal(discovery.devices[0].brand, 'Xiaomi');
  assert.equal(discovery.devices[0].model, 'fixture.model');
  assert.equal(discovery.devices[0].integration, 'xiaomi_home');
  assert.equal(discovery.unsupported.length, 2);
  assert.deepEqual(store.devices(), []);
  assert.equal(remote.writes, 0);
});

test('Xiaomi import revalidates every selected entity before writing and does not duplicate devices', async (t) => {
  const { app, store, remote } = fixture(t);
  for (const entityIds of [[], ['light.reading', 'light.reading']]) assert.equal((await app.inject(post('import', { entityIds }))).statusCode, 400);
  assert.equal(remote.calls.length, 0);
  for (const entityIds of [['light.reading', 'light.unrelated'], ['fan.living'], ['sensor.disabled']]) {
    assert.equal((await app.inject(post('import', { entityIds }))).statusCode, 409);
    assert.deepEqual(store.devices(), []);
  }
  await app.inject(post('discover'));
  remote.registry = remote.registry.filter((item) => item.entity_id !== 'cover.window');
  assert.equal((await app.inject(post('import', { entityIds: ['light.reading', 'cover.window'] }))).statusCode, 409);
  assert.deepEqual(store.devices(), []);
  for (let i = 0; i < 2; i++) assert.equal((await app.inject(post('import', { entityIds: ['light.reading'] }))).json().count, 1);
  assert.equal(store.devices().length, 1);
  assert.equal(remote.writes, 0);
});

test('imported Xiaomi devices share manual, scene and Agent controls and retain metadata after readback', async (t) => {
  const { app, store, remote } = fixture(t);
  await app.inject(post('import', { entityIds: ['light.reading', 'cover.window'] }));
  await app.inject({ method: 'PATCH', url: '/api/devices/ha%3Alight.reading', payload: { room: '阅读角' } });
  assert.equal((await app.inject({ method: 'POST', url: '/api/control', payload: { deviceId: 'ha:light.reading', changes: { brightness: 30 } } })).statusCode, 200);
  const scene = await app.inject({ method: 'POST', url: '/api/scenes', payload: { name: '米家阅读', actions: [{ deviceId: 'ha:cover.window', changes: { position: 40 } }] } });
  assert.equal((await app.inject({ method: 'POST', url: `/api/scenes/${scene.json().id}/run` })).json().status, 'success');
  const chat = await app.inject({ method: 'POST', url: '/api/chat', payload: { message: '关闭米家阅读灯' } });
  assert.match(chat.json().content, /已调整/);
  const light = store.get<Device>('devices', 'ha:light.reading')!;
  assert.equal(light.state.power, false);
  assert.equal(light.room, '阅读角');
  assert.equal(light.model, 'fixture.model');
  assert.equal(light.integration, 'xiaomi_home');
  assert.equal(light.brand, 'Xiaomi');
  assert.equal(store.get<Device>('devices', 'ha:cover.window')!.state.position, 40);
  assert.equal(remote.writes, 3);
  const home = (await app.inject('/api/home')).json<HomeSnapshot>();
  assert.deepEqual(home.events.map((event) => event.source).sort(), ['agent', 'manual', 'scene']);
  assert.ok(home.events.every((event) => event.status === 'success'));
});

test('Xiaomi sync refreshes only imported entities, preserves rooms and marks disappeared devices offline', async (t) => {
  const { app, store, remote } = fixture(t);
  assert.equal((await app.inject(post('sync'))).statusCode, 409);
  await app.inject(post('import', { entityIds: ['light.reading'] }));
  await app.inject({ method: 'PATCH', url: '/api/devices/ha%3Alight.reading', payload: { room: '阅读角' } });
  remote.states[0].state = 'off';
  assert.deepEqual((await app.inject(post('sync'))).json(), { count: 1, offline: 0 });
  assert.equal(store.devices().length, 1);
  assert.equal(store.devices()[0].state.power, false);
  assert.equal(store.devices()[0].room, '阅读角');
  remote.registry = [];
  assert.equal((await app.inject(post('sync'))).json().offline, 1);
  assert.equal(store.devices()[0].online, false);
  assert.equal((await app.inject({ method: 'POST', url: '/api/control', payload: { deviceId: 'ha:light.reading', changes: { power: true } } })).statusCode, 409);
  assert.equal(remote.writes, 0);
});

test('generic HA sync preserves previously discovered Xiaomi metadata', async (t) => {
  const { app, store } = fixture(t);
  await app.inject(post('import', { entityIds: ['light.reading'] }));
  await app.inject({ method: 'POST', url: '/api/connections/home-assistant/sync' });
  const device = store.get<Device>('devices', 'ha:light.reading')!;
  assert.equal(device.integration, 'xiaomi_home');
  assert.equal(device.brand, 'Xiaomi');
  assert.equal(device.model, 'fixture.model');
  assert.equal(device.room, '书房');
});

test('Xiaomi discovery distinguishes authorization, read failures and malformed replies without leaking tokens', async (t) => {
  for (const [failure, code] of [['401', 'HA_REJECTED'], ['403', 'HA_PERMISSION'], ['network', 'HA_UNREACHABLE'], ['malformed', 'HA_RESPONSE']]) {
    await t.test(failure, async (t) => {
      const { app, store, remote } = fixture(t);
      await app.inject(post('import', { entityIds: ['light.reading'] }));
      remote.failure = failure;
      const response = await app.inject(post('discover'));
      assert.equal(response.statusCode, 502);
      assert.equal(response.json().error, code);
      assert.equal(store.devices()[0].online, false);
      const home = await app.inject('/api/home');
      assert.equal(home.json<HomeSnapshot>().xiaomi.status, 'error');
      assert.ok(!home.body.includes('xiaomi-secret-fixture'));
      assert.ok(!response.body.includes('xiaomi-secret-fixture'));
      assert.equal(remote.writes, 0);
      remote.failure = '';
      assert.equal((await app.inject(post('sync'))).statusCode, 200);
      assert.equal(store.devices()[0].online, true);
    });
  }
});

test('Xiaomi discovery handles empty integrations and rejects malformed registry metadata', async (t) => {
  const { app, remote } = fixture(t);
  remote.registry = [];
  assert.deepEqual((await app.inject(post('discover'))).json(), { devices: [], unsupported: [], total: 0 });
  const entry = { entity_id: 'light.reading', area: '书房', manufacturer: 'Xiaomi', model: 'test' };
  remote.registry = [entry, entry];
  assert.equal((await app.inject(post('discover'))).json().error, 'HA_RESPONSE');
});

test('Xiaomi import rolls back the full local selection if persistence fails', async (t) => {
  const { app, store, remote } = fixture(t);
  store.db.exec("CREATE TRIGGER reject_cover BEFORE INSERT ON documents WHEN NEW.id='ha:cover.window' BEGIN SELECT RAISE(ABORT, 'fixture failure'); END");
  assert.equal((await app.inject(post('import', { entityIds: ['light.reading', 'cover.window'] }))).statusCode, 500);
  assert.deepEqual(store.devices(), []);
  assert.equal(remote.writes, 0);
});

test('Xiaomi routes require the same Hub authorization as other controls', async (t) => {
  const { app, remote } = fixture(t, 'hub-fixture');
  for (const action of ['discover', 'import', 'sync']) assert.equal((await app.inject(post(action))).statusCode, 401);
  assert.equal(remote.calls.length, 0);
  assert.equal((await app.inject({ ...post('discover'), headers: { authorization: 'Bearer hub-fixture' } })).statusCode, 200);
});

test('Xiaomi discovery reports missing bridge configuration', async (t) => {
  const { app } = buildApp({ databasePath: ':memory:', demo: false, staticRoot: false });
  t.after(() => app.close());
  assert.equal((await app.inject(post('discover'))).statusCode, 409);
  assert.equal((await app.inject('/api/home')).json<HomeSnapshot>().xiaomi.configured, false);
});
