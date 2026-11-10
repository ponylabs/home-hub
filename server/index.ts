import { buildApp } from './app.js';
import { HomeAssistant } from './home-assistant.js';

const env = process.env;
const host = env.HOST || '127.0.0.1';
if (!['127.0.0.1', 'localhost'].includes(host) && !env.HUB_API_TOKEN) throw new Error('监听局域网地址需要配置 HUB_API_TOKEN');
if (!!env.HA_URL !== !!env.HA_TOKEN) throw new Error('HA_URL 和 HA_TOKEN 必须同时配置');
if ((env.AI_API_KEY || env.AI_MODEL) && !(env.AI_API_KEY && env.AI_MODEL)) throw new Error('AI_API_KEY 和 AI_MODEL 必须同时配置');
const port = Number(env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 必须是有效端口号');
if (env.DEMO_MODE && !['true', 'false'].includes(env.DEMO_MODE)) throw new Error('DEMO_MODE 必须为 true 或 false');
const { app } = buildApp({
  databasePath: env.DATABASE_PATH || 'data/home-hub.sqlite', demo: env.DEMO_MODE !== 'false', apiToken: env.HUB_API_TOKEN,
  ha: env.HA_URL && env.HA_TOKEN ? new HomeAssistant(env.HA_URL, env.HA_TOKEN) : undefined,
  model: env.AI_API_KEY && env.AI_MODEL ? { baseUrl: env.AI_BASE_URL || 'https://api.openai.com/v1', apiKey: env.AI_API_KEY, model: env.AI_MODEL } : undefined,
  logger: true,
});
await app.listen({ host, port });
let closing = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => {
  if (closing) return;
  closing = true;
  void app.close().then(() => process.exit(0), () => process.exit(1));
});
