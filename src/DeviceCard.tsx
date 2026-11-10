import { ActionIcon, Badge, Card, Group, Slider, Switch, Text, Tooltip } from '@mantine/core';
import { Lightbulb, AirVent, PanelsTopLeft, Plug, Thermometer, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Changes, Device } from '../shared/types';

export const deviceIcons = { light: Lightbulb, climate: AirVent, cover: PanelsTopLeft, switch: Plug, sensor: Thermometer };
export function DeviceCard({ device, pending, onChange, onDetails }: {
  device: Device; pending: boolean; onChange: (changes: Changes) => Promise<boolean>; onDetails?: () => void;
}) {
  const Icon = deviceIcons[device.kind];
  const active = device.state.power || (device.kind === 'cover' && (device.state.position ?? 0) > 0);
  const sliderKey = device.capabilities.includes('brightness') ? 'brightness' : device.capabilities.includes('temperature') ? 'temperature' : device.capabilities.includes('position') ? 'position' : null;
  const actualValue = sliderKey ? device.state[sliderKey] ?? 0 : 0;
  const [value, setValue] = useState(actualValue);
  useEffect(() => { setValue(actualValue); }, [actualValue, device.id]);
  const unit = sliderKey === 'temperature' ? '°C' : '%';
  return <Card className={`device-card ${active && device.online ? 'is-active' : ''}`}>
    <Group justify="space-between" wrap="nowrap" mb="md">
      <div className={`device-icon ${active ? 'on' : ''}`}><Icon size={21} strokeWidth={1.7} /></div>
      {device.capabilities.includes('power') ? <Switch checked={!!device.state.power} disabled={pending || !device.online} onChange={(event) => void onChange({ power: event.currentTarget.checked })} size="md" aria-label={`${device.name}电源`} /> : <Badge size="xs" variant="dot" color={device.online ? 'mint' : 'gray'}>{device.online ? device.kind === 'sensor' ? '只读' : '在线' : '离线'}</Badge>}
    </Group>
    <Group justify="space-between" gap={4} wrap="nowrap">
      <Text fw={500} size="sm">{device.name}</Text>
      {onDetails && <Tooltip label="设备详情"><ActionIcon size="sm" onClick={onDetails} aria-label={`${device.name}详情`}><SlidersHorizontal size={14} /></ActionIcon></Tooltip>}
    </Group>
    <Text className="device-meta" size="xs" c="dimmed">{device.brand} · {device.protocol}{device.adapter === 'demo' && device.protocol !== '模拟' ? ' · 模拟' : ''}</Text>
    {!device.online ? <Text c="orange.3" size="xs" mt="md">设备离线，暂不可控制</Text> : sliderKey ? <div className="device-adjustment">
      <Group justify="space-between" mb={9}><Text size="xs" c="dimmed">{sliderKey === 'brightness' ? '亮度' : sliderKey === 'temperature' ? '目标温度' : '窗帘开度'}</Text><Text size="xs" fw={600}>{value}{unit}</Text></Group>
      <Slider value={value} onChange={setValue} onChangeEnd={async (next) => { const ok = await onChange({ [sliderKey]: next }); if (!ok) setValue(actualValue); }} min={sliderKey === 'temperature' ? device.temperatureRange?.[0] ?? 16 : 0} max={sliderKey === 'temperature' ? device.temperatureRange?.[1] ?? 30 : 100} step={sliderKey === 'temperature' ? 0.5 : 1} disabled={pending} size="sm" color={device.kind === 'light' ? 'yellow.3' : 'mint.4'} thumbLabel={`${device.name}${sliderKey === 'temperature' ? '温度' : sliderKey === 'brightness' ? '亮度' : '开度'}`} label={(v) => `${v}${unit}`} />
    </div> : device.kind === 'sensor' ? <Group mt="md" justify="space-between"><Text size="lg">{device.state.currentTemperature ?? device.state.value ?? '—'}<span className="unit">{device.state.currentTemperature !== undefined ? '°C' : device.state.unit}</span></Text>{device.state.humidity !== undefined && <Text c="dimmed" size="sm">{device.state.humidity}% RH</Text>}</Group> : <Text size="xs" c="dimmed" mt="md">{device.state.power ? '已开启' : '已关闭'}</Text>}
  </Card>;
}
