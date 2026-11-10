import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { z, ZodError } from 'zod';
import { Store } from './store.js';
import { Hub } from './hub.js';
import { HomeAssistant } from './home-assistant.js';
import { Agent, agentTools, executeTool, type ModelConfig } from './agent.js';
import { HubError } from './schema.js';

export type AppConfig = { databasePath: string; demo?: boolean; apiToken?: string; ha?: HomeAssistant; model?: ModelConfig; modelFetch?: typeof fetch; staticRoot?: string | false; logger?: boolean };
function isApiPath(url: string) {
  try { return /^\/+api(?:\/|$)/.test(decodeURIComponent(url.split('?')[0])); }
  catch { return false; }
}
export function buildApp(config: AppConfig) {
  const app = Fastify({ logger: config.logger ?? false, bodyLimit: 32 * 1024, requestTimeout: 120000 });
  const store = new Store(config.databasePath, config.demo ?? true);
  const hub = new Hub(store, config.ha, config.demo ?? true);
  const agent = new Agent(hub, config.model, config.modelFetch);
  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    const hostname = request.hostname.split(':')[0];
    if (!config.apiToken && !['localhost', '127.0.0.1'].includes(hostname)) throw new HubError('HOST_FORBIDDEN', '不允许的访问地址。', 403);
    // Use the router's matched pattern, since encoded URL segments are decoded before routing.
    if (!request.routeOptions.url?.startsWith('/api/') && !isApiPath(request.url)) return;
    reply.header('Cache-Control', 'no-store');
    const origin = request.headers.origin;
    if (origin) {
      const allowed = new Set([`http://${request.headers.host}`, `https://${request.headers.host}`, 'http://127.0.0.1:5173', 'http://localhost:5173']);
      if (!allowed.has(origin)) throw new HubError('ORIGIN_FORBIDDEN', '不允许的请求来源。', 403);
    }
    if (config.apiToken) {
      const provided = Buffer.from((request.headers.authorization ?? '').replace(/^Bearer /, ''));
      const expected = Buffer.from(config.apiToken);
      if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new HubError('UNAUTHORIZED', '请输入 Home Hub 访问令牌。', 401);
    }
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HubError) return reply.status(error.status).send({ error: error.code, message: error.message });
    if (error instanceof ZodError) return reply.status(400).send({ error: 'VALIDATION', message: '参数不符合要求，请检查设备能力及数值范围。' });
    if (error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number' && error.statusCode < 500) return reply.status(error.statusCode).send({ error: 'BAD_REQUEST', message: '请求格式不正确。' });
    // Do not log payloads, tokens, provider bodies or arbitrary upstream error strings.
    app.log.error({ type: error instanceof Error ? error.name : 'Unknown' }, '内部请求失败');
    return reply.status(500).send({ error: 'INTERNAL', message: '服务暂时无法完成请求，请查看设备状态后重试。' });
  });
  app.get('/api/home', () => hub.snapshot(agent.info()));
  app.post('/api/devices', async (request, reply) => reply.status(201).send(hub.addDemo(request.body)));
  app.post('/api/control', async (request) => hub.control(request.body));
  app.patch<{ Params: { id: string } }>('/api/devices/:id', async (request) => {
    const { room } = z.object({ room: z.string().trim().min(1).max(20) }).strict().parse(request.body);
    return hub.assignRoom(request.params.id, room);
  });
  app.post('/api/scenes', async (request, reply) => reply.status(201).send(hub.addScene(request.body)));
  app.post<{ Params: { id: string } }>('/api/scenes/:id/run', async (request) => hub.runScene(request.params.id));
  app.post('/api/connections/home-assistant/sync', async () => hub.sync());
  app.post('/api/chat', async (request) => {
    const { message } = z.object({ message: z.string().trim().min(1).max(2000) }).strict().parse(request.body);
    return agent.chat(message);
  });
  app.get('/api/agent/tools', () => ({ tools: agentTools }));
  app.post('/api/agent/execute', async (request) => {
    const data = z.object({ name: z.string(), arguments: z.unknown() }).strict().parse(request.body);
    return executeTool(hub, data.name, data.arguments);
  });
  const staticRoot = config.staticRoot ?? resolve('dist/client');
  if (staticRoot && existsSync(staticRoot)) {
    app.register(fastifyStatic, { root: staticRoot });
    app.setNotFoundHandler((request, reply) => isApiPath(request.url) ? reply.status(404).send({ error: 'NOT_FOUND', message: '接口不存在。' }) : reply.sendFile('index.html'));
  }
  app.addHook('onClose', async () => { await hub.idle(); store.close(); });
  return { app, hub, store, agent };
}
