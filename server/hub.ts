import { randomUUID } from 'node:crypto';
import type { AuditEvent, ChatMessage, Changes, Command, Device, HomeSnapshot, Scene, SceneResult } from '../shared/types.js';
import { Store } from './store.js';
import { HomeAssistant } from './home-assistant.js';
import { addDeviceSchema, commandSchema, HubError, sceneSchema } from './schema.js';
import { newDemoDevice } from './seed.js';

export class Hub {
  connection: HomeSnapshot['connection'];
  private tail: Promise<unknown> = Promise.resolve();
  constructor(readonly store: Store, readonly ha?: HomeAssistant, readonly demo = true) {
    this.connection = { configured: !!ha, status: 'disconnected', message: ha ? '尚未同步设备' : '未配置 Home Assistant' };
    // Cached bridge state is stale until a successful discovery in this process.
    for (const device of store.devices()) if (device.adapter === 'home-assistant') store.put('devices', { ...device, online: false });
  }
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.tail.then(fn); this.tail = result.catch(() => undefined); return result;
  }
  async idle() { await this.tail; }
  snapshot(agent: HomeSnapshot['agent']): HomeSnapshot {
    return { devices: this.store.devices(), scenes: this.store.scenes(), events: this.store.list<AuditEvent>('events').reverse().slice(0, 50),
      messages: this.store.list<ChatMessage>('messages'), connection: this.connection, agent, demo: this.demo };
  }
  validate(input: unknown): { command: Command; device: Device } {
    const command = commandSchema.parse(input);
    const device = this.store.get<Device>('devices', command.deviceId);
    if (!device) throw new HubError('NOT_FOUND', '设备不存在。', 404);
    if (!device.online) throw new HubError('OFFLINE', '设备离线，请恢复连接后再操作。', 409);
    for (const key of Object.keys(command.changes) as (keyof Changes)[]) {
      if (!device.capabilities.includes(key)) throw new HubError('UNSUPPORTED', `设备不支持 ${key} 控制。`);
    }
    if (command.changes.power === false && (command.changes.brightness !== undefined || command.changes.temperature !== undefined)) throw new HubError('CONFLICT', '关闭设备与调节亮度或温度请分开操作。');
    const temperature = command.changes.temperature;
    if (temperature !== undefined && device.temperatureRange && (temperature < device.temperatureRange[0] || temperature > device.temperatureRange[1])) {
      throw new HubError('OUT_OF_RANGE', `此设备支持 ${device.temperatureRange[0]}–${device.temperatureRange[1]}°C。`);
    }
    return { command, device };
  }
  control(input: unknown, source: AuditEvent['source'] = 'manual'): Promise<Device> {
    return this.serialize(() => this.execute(input, source));
  }
  private async execute(input: unknown, source: AuditEvent['source']): Promise<Device> {
    const { command, device } = this.validate(input);
    const event = this.store.event(source, device.name, 'pending', describeChanges(command.changes));
    try {
      let updated: Device;
      if (device.adapter === 'demo') {
        const changes = command.changes;
        updated = { ...device, state: { ...device.state, ...changes, ...(changes.brightness !== undefined ? { power: changes.brightness > 0 } : {}) }, updatedAt: new Date().toISOString() };
      } else {
        if (!this.ha) throw new HubError('NOT_CONFIGURED', '请先配置 Home Assistant。', 409);
        updated = await this.ha.control(device, command.changes);
      }
      this.store.put('devices', updated);
      const confirmed = Object.entries(command.changes).every(([key, expected]) => {
        const actual = updated.state[key as keyof Changes];
        if (key === 'power' && command.changes.brightness === 0) return actual === false;
        return typeof expected === 'number' && typeof actual === 'number' ? Math.abs(actual - expected) <= (key === 'brightness' ? 1 : 0.1) : actual === expected;
      });
      if (!confirmed) throw new HubError('RESULT_UNKNOWN', '指令已发送，设备尚未回报目标状态，请稍后同步确认。', 502);
      this.store.put('events', { ...event, status: 'success' });
      return updated;
    } catch (error) {
      const known = error instanceof HubError;
      this.store.put('events', { ...event, status: known && error.code === 'NOT_CONFIGURED' ? 'failed' : 'uncertain', detail: known ? error.message : '操作结果未确认，请检查设备状态。' });
      throw error;
    }
  }
  runScene(id: string, source: AuditEvent['source'] = 'scene'): Promise<SceneResult> {
    return this.serialize(async () => {
      const scene = this.store.get<Scene>('scenes', id);
      if (!scene) throw new HubError('NOT_FOUND', '场景不存在。', 404);
      // Validate every target before causing any side effects.
      for (const action of scene.actions) this.validate(action);
      const results: SceneResult['results'] = [];
      for (const action of scene.actions) {
        try { await this.execute(action, source); results.push({ deviceId: action.deviceId, ok: true, message: '已完成' }); }
        catch (error) {
          results.push({ deviceId: action.deviceId, ok: false, message: error instanceof HubError ? error.message : '执行结果未确认' });
          break; // Stop dependent work; no automatic replay or fictional rollback.
        }
      }
      return { status: results.every((r) => r.ok) ? 'success' : results.some((r) => r.ok) ? 'partial' : 'failed', results };
    });
  }
  sync(): Promise<{ count: number }> {
    return this.serialize(async () => {
      if (!this.ha) throw new HubError('NOT_CONFIGURED', '请在 .env 中配置 HA_URL 和 HA_TOKEN，然后重启服务。', 409);
      try {
        const devices = await this.ha.discover();
        const ids = new Set(devices.map((d) => d.id));
        for (const old of this.store.devices().filter((d) => d.adapter === 'home-assistant')) if (!ids.has(old.id)) this.store.put('devices', { ...old, online: false });
        for (const device of devices) {
          const old = this.store.get<Device>('devices', device.id);
          this.store.put('devices', { ...device, room: old?.room ?? device.room });
        }
        this.connection = { configured: true, status: 'connected', message: `已同步 ${devices.length} 个设备` };
        return { count: devices.length };
      } catch (error) {
        for (const device of this.store.devices().filter((d) => d.adapter === 'home-assistant')) this.store.put('devices', { ...device, online: false });
        this.connection = { configured: true, status: 'error', message: error instanceof HubError ? error.message : '同步失败，请检查连接。' };
        throw error;
      }
    });
  }
  addDemo(input: unknown) {
    if (!this.demo) throw new HubError('DEMO_DISABLED', '模拟模式已关闭。', 409);
    const data = addDeviceSchema.parse(input);
    return this.store.put('devices', newDemoDevice(`demo:${randomUUID()}`, data.name, data.room, data.kind));
  }
  addScene(input: unknown) {
    const data = sceneSchema.parse(input);
    for (const action of data.actions) this.validate(action);
    return this.store.put('scenes', { ...data, id: randomUUID() });
  }
  assignRoom(id: string, room: string) {
    return this.serialize(async () => {
      const device = this.store.get<Device>('devices', id);
      if (!device) throw new HubError('NOT_FOUND', '设备不存在。', 404);
      return this.store.put('devices', { ...device, room });
    });
  }
}
export function describeChanges(changes: Changes) {
  return [changes.power === undefined ? '' : changes.power ? '打开' : '关闭',
    changes.brightness === undefined ? '' : `亮度 ${changes.brightness}%`,
    changes.temperature === undefined ? '' : `温度 ${changes.temperature}°C`,
    changes.position === undefined ? '' : `窗帘打开 ${changes.position}%`].filter(Boolean).join(' · ');
}
