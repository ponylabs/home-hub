export type DeviceKind = 'light' | 'climate' | 'cover' | 'switch' | 'sensor';
export type Changes = { power?: boolean; brightness?: number; temperature?: number; position?: number };
export type Device = {
  id: string;
  name: string;
  room: string;
  kind: DeviceKind;
  brand: string;
  protocol: string;
  adapter: 'demo' | 'home-assistant';
  entityId?: string;
  integration?: 'xiaomi_home';
  model?: string;
  online: boolean;
  capabilities: (keyof Changes)[];
  state: Changes & { currentTemperature?: number; humidity?: number; value?: number; unit?: string };
  temperatureRange?: [number, number];
  updatedAt: string;
};
export type Command = { deviceId: string; changes: Changes };
export type Scene = { id: string; name: string; description: string; icon: 'home' | 'movie' | 'moon'; actions: Command[] };
export type AuditEvent = {
  id: string;
  time: string;
  source: 'manual' | 'agent' | 'scene';
  label: string;
  status: 'pending' | 'success' | 'failed' | 'uncertain';
  detail: string;
};
export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; time: string; actions?: string[] };
export type ConnectionState = { configured: boolean; status: 'disconnected' | 'connected' | 'error'; message: string };
export type XiaomiDiscovery = {
  devices: Device[];
  unsupported: { entityId: string; name: string; reason: string }[];
  total: number;
};
export type HomeSnapshot = {
  devices: Device[];
  scenes: Scene[];
  events: AuditEvent[];
  messages: ChatMessage[];
  connection: ConnectionState;
  xiaomi: ConnectionState;
  agent: { mode: 'local' | 'model'; model: string | null };
  demo: boolean;
};
export type SceneResult = { status: 'success' | 'partial' | 'failed'; results: { deviceId: string; ok: boolean; message: string }[] };
