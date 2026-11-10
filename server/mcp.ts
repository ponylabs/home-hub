import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { agentTools } from './agent.js';

const baseUrl = process.env.HUB_URL || 'http://127.0.0.1:3001';
const server = new Server({ name: 'home-hub', version: '0.1.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: agentTools }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const response = await fetch(`${baseUrl}/api/agent/execute`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.HUB_API_TOKEN ? { Authorization: `Bearer ${process.env.HUB_API_TOKEN}` } : {}) },
      body: JSON.stringify({ name: request.params.name, arguments: request.params.arguments ?? {} }), signal: AbortSignal.timeout(60000), redirect: 'error',
    });
    const data = await response.json() as { status?: string };
    return { content: [{ type: 'text', text: JSON.stringify(data) }], isError: !response.ok || data.status === 'partial' || data.status === 'failed' };
  } catch {
    return { content: [{ type: 'text', text: '无法确认 Home Hub 的操作结果。请检查服务与操作记录，不要自动重试。' }], isError: true };
  }
});
await server.connect(new StdioServerTransport());
