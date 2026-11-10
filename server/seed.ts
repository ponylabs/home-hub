import type { Device, DeviceKind, Scene } from '../shared/types.js';

export function newDemoDevice(id: string, name: string, room: string, kind: DeviceKind): Device {
  const presets: Record<DeviceKind, Pick<Device, 'capabilities' | 'state'>> = {
    light: { capabilities: ['power', 'brightness'], state: { power: true, brightness: 70 } },
    climate: { capabilities: ['power', 'temperature'], state: { power: true, temperature: 26, currentTemperature: 25.6 } },
    cover: { capabilities: ['position'], state: { position: 60 } },
    switch: { capabilities: ['power'], state: { power: false } },
    sensor: { capabilities: [], state: { currentTemperature: 25.6, humidity: 47 } },
  };
  return { id, name, room, kind, brand: '演示设备', protocol: '模拟', adapter: 'demo', online: true,
    ...structuredClone(presets[kind]), ...(kind === 'climate' ? { temperatureRange: [16, 30] as [number, number] } : {}), updatedAt: new Date().toISOString() };
}
export function demoDevices(): Device[] {
  return [
    { ...newDemoDevice('living-light', '客厅主灯', '客厅', 'light'), brand: 'Yeelight', protocol: 'Wi-Fi' },
    { ...newDemoDevice('living-ac', '客厅空调', '客厅', 'climate'), brand: '美的', protocol: 'Wi-Fi' },
    { ...newDemoDevice('living-curtain', '落地窗帘', '客厅', 'cover'), brand: 'Aqara', protocol: 'Zigbee' },
    { ...newDemoDevice('living-sensor', '温湿度传感器', '客厅', 'sensor'), brand: 'Aqara', protocol: 'Zigbee' },
    { ...newDemoDevice('bedroom-light', '卧室床头灯', '主卧', 'light'), brand: 'Philips Hue', protocol: 'Zigbee', state: { power: false, brightness: 35 } },
    { ...newDemoDevice('bedroom-ac', '卧室空调', '主卧', 'climate'), brand: '格力', protocol: 'Wi-Fi', state: { power: false, temperature: 25, currentTemperature: 24.8 } },
    { ...newDemoDevice('study-light', '书房台灯', '书房', 'light'), brand: '米家', protocol: 'Wi-Fi', state: { power: true, brightness: 80 } },
    { ...newDemoDevice('kitchen-plug', '厨房插座', '厨房', 'switch'), brand: 'Tapo', protocol: 'Matter' },
    { ...newDemoDevice('balcony-light', '阳台灯', '阳台', 'light'), brand: 'Aqara', protocol: 'Zigbee', state: { power: false, brightness: 100 } },
  ];
}
export const demoScenes: Scene[] = [
  { id: 'welcome', name: '回家模式', description: '亮起灯光，打开窗帘', icon: 'home', actions: [
    { deviceId: 'living-light', changes: { power: true, brightness: 75 } },
    { deviceId: 'living-curtain', changes: { position: 100 } },
    { deviceId: 'living-ac', changes: { power: true, temperature: 26 } },
  ] },
  { id: 'cinema', name: '观影模式', description: '柔和灯光，落下窗帘', icon: 'movie', actions: [
    { deviceId: 'living-light', changes: { power: true, brightness: 20 } },
    { deviceId: 'living-curtain', changes: { position: 0 } },
  ] },
  { id: 'goodnight', name: '晚安模式', description: '关闭公区灯光，点亮床头', icon: 'moon', actions: [
    { deviceId: 'living-light', changes: { power: false } },
    { deviceId: 'study-light', changes: { power: false } },
    { deviceId: 'bedroom-light', changes: { power: true, brightness: 15 } },
  ] },
];
