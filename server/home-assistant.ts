import { z } from 'zod';
import type { Changes, Device, DeviceKind, XiaomiDiscovery } from '../shared/types.js';
import { HubError } from './schema.js';

const stateSchema = z.object({ entity_id: z.string(), state: z.string(), attributes: z.record(z.string(), z.unknown()), last_updated: z.string() });
type HAState = z.infer<typeof stateSchema>;
const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const xiaomiRegistrySchema = z.array(z.object({
  entity_id: z.string().min(1).max(200),
  area: z.string().nullish(), manufacturer: z.string().nullish(), model: z.string().nullish(),
})).refine((items) => new Set(items.map((item) => item.entity_id)).size === items.length);
// Fixed, read-only template: registry membership identifies Xiaomi entities even after renaming.
const xiaomiRegistryTemplate = `{% set ns = namespace(items=[]) %}
{% for entity in integration_entities('xiaomi_home') %}
{% set ns.items = ns.items + [{'entity_id': entity, 'area': area_name(entity), 'manufacturer': device_attr(entity, 'manufacturer'), 'model': device_attr(entity, 'model')}] %}
{% endfor %}
{{ ns.items | to_json }}`;

export function mapEntity(entity: HAState): Device | null {
  const domain = entity.entity_id.split('.')[0];
  if (!['light', 'climate', 'cover', 'switch', 'sensor'].includes(domain)) return null;
  const a = entity.attributes;
  const kind = domain as DeviceKind;
  const state: Device['state'] = {};
  const capabilities: Device['capabilities'] = [];
  if (kind === 'light' || kind === 'switch') { state.power = entity.state === 'on'; capabilities.push('power'); }
  if (kind === 'light') {
    const modes = Array.isArray(a.supported_color_modes) ? a.supported_color_modes : [];
    if (modes.some((mode) => !['onoff', 'unknown'].includes(String(mode)))) {
      capabilities.push('brightness'); state.brightness = Math.round((numeric(a.brightness) ?? 0) / 255 * 100);
    }
  }
  if (kind === 'climate') {
    const features = numeric(a.supported_features) ?? 0;
    state.power = entity.state !== 'off';
    // Home Assistant publishes TURN_ON=256, TURN_OFF=128 and TARGET_TEMPERATURE=1.
    if ((features & 384) === 384) capabilities.push('power');
    if ((features & 1) === 1) capabilities.push('temperature');
    state.temperature = numeric(a.temperature); state.currentTemperature = numeric(a.current_temperature);
  }
  if (kind === 'cover') {
    state.position = numeric(a.current_position);
    if (((numeric(a.supported_features) ?? 0) & 4) === 4) capabilities.push('position');
  }
  if (kind === 'sensor') {
    const value = Number(entity.state);
    if (Number.isFinite(value)) {
      state.value = value; state.unit = typeof a.unit_of_measurement === 'string' ? a.unit_of_measurement : '';
      if (a.device_class === 'temperature' && a.unit_of_measurement === '°C') state.currentTemperature = value;
      if (a.device_class === 'humidity') state.humidity = value;
    }
  }
  return {
    id: `ha:${entity.entity_id}`, entityId: entity.entity_id,
    name: typeof a.friendly_name === 'string' ? a.friendly_name : entity.entity_id,
    room: '未分配', kind, brand: 'Home Assistant', protocol: 'HA Bridge', adapter: 'home-assistant',
    online: !['unavailable', 'unknown'].includes(entity.state), capabilities, state,
    ...(kind === 'climate' ? { temperatureRange: [numeric(a.min_temp) ?? 16, numeric(a.max_temp) ?? 30] as [number, number] } : {}),
    updatedAt: entity.last_updated,
  };
}

export class HomeAssistant {
  constructor(private url: string, private token: string, private fetcher: typeof fetch = fetch) {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('HA_URL 必须是不含凭据的 HTTP(S) 地址');
    this.url = url.replace(/\/+$/, '');
  }
  private async request(path: string, body?: object): Promise<unknown> {
    const writesDevice = path.startsWith('services/');
    let response: Response;
    try {
      response = await this.fetcher(`${this.url}/api/${path}`, {
        method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000), redirect: 'error',
      });
    } catch {
      throw new HubError(writesDevice ? 'RESULT_UNKNOWN' : 'HA_UNREACHABLE', writesDevice ? '指令结果未确认，请同步后检查设备，系统不会自动重发。' : '无法连接 Home Assistant，请检查服务地址和网络。', 502);
    }
    if (response.status === 403 && path === 'template') throw new HubError('HA_PERMISSION', '发现小米设备需要 Home Assistant 管理员的长期访问令牌，请更新 HA_TOKEN 后重启。', 502);
    if (!response.ok) throw new HubError('HA_REJECTED', response.status === 401 ? 'Home Assistant 令牌失效，请更新服务端配置。' : `Home Assistant 拒绝了请求（${response.status}）。`, 502);
    try { return await response.json(); } catch { throw new HubError('HA_RESPONSE', 'Home Assistant 返回了无效数据，请同步后检查状态。', 502); }
  }
  async discover(): Promise<Device[]> {
    const parsed = z.array(stateSchema).safeParse(await this.request('states'));
    if (!parsed.success) throw new HubError('HA_RESPONSE', 'Home Assistant 设备数据格式不正确。', 502);
    return parsed.data.map(mapEntity).filter((device): device is Device => device !== null);
  }
  async discoverXiaomi(): Promise<XiaomiDiscovery> {
    const registry = xiaomiRegistrySchema.safeParse(await this.request('template', { template: xiaomiRegistryTemplate }));
    if (!registry.success) throw new HubError('HA_RESPONSE', '小米设备来源信息无效，请检查 Home Assistant 的官方 Xiaomi Home 集成。', 502);
    const states = z.array(stateSchema).safeParse(await this.request('states'));
    if (!states.success) throw new HubError('HA_RESPONSE', 'Home Assistant 设备数据格式不正确。', 502);
    const byId = new Map(states.data.map((state) => [state.entity_id, state]));
    const result: XiaomiDiscovery = { devices: [], unsupported: [], total: registry.data.length };
    for (const metadata of registry.data) {
      const entity = byId.get(metadata.entity_id);
      const device = entity ? mapEntity(entity) : null;
      if (!device) {
        result.unsupported.push({ entityId: metadata.entity_id,
          name: typeof entity?.attributes.friendly_name === 'string' ? entity.attributes.friendly_name : metadata.entity_id,
          reason: entity ? '当前支持灯光、空调、窗帘、开关和传感器，此类型暂未支持。' : '中枢未提供状态，请检查该设备是否已启用。' });
        continue;
      }
      result.devices.push({ ...device, integration: 'xiaomi_home', brand: metadata.manufacturer || '小米生态',
        protocol: 'Xiaomi Home · HA', model: metadata.model || undefined, room: metadata.area || '未分配' });
    }
    return result;
  }
  async control(device: Device, changes: Changes): Promise<Device> {
    const data = { entity_id: device.entityId };
    const domain = device.kind;
    if (changes.power === false) await this.request(`services/${domain}/turn_off`, data);
    if (domain === 'light' && (changes.power === true || changes.brightness !== undefined)) {
      await this.request('services/light/turn_on', { ...data, ...(changes.brightness !== undefined ? { brightness_pct: changes.brightness } : {}) });
    } else if (changes.power === true) await this.request(`services/${domain}/turn_on`, data);
    if (changes.temperature !== undefined) await this.request('services/climate/set_temperature', { ...data, temperature: changes.temperature });
    if (changes.position !== undefined) await this.request('services/cover/set_cover_position', { ...data, position: changes.position });
    let observed: Device | null;
    try { observed = mapEntity(stateSchema.parse(await this.request(`states/${encodeURIComponent(device.entityId!)}`))); }
    catch { throw new HubError('RESULT_UNKNOWN', '指令已发送，但状态回读失败，请同步后检查设备。', 502); }
    if (!observed) throw new HubError('HA_RESPONSE', '设备类型不受支持。', 502);
    return { ...device, ...observed, room: device.room, brand: device.brand, protocol: device.protocol };
  }
}
