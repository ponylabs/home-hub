import { useEffect, useRef, useState } from 'react';
import { Accordion, Alert, Anchor, Badge, Button, Checkbox, Code, Divider, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { Cable, Check, RefreshCw, Search } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import type { DeviceKind, HomeSnapshot, XiaomiDiscovery } from '../shared/types';
import { api } from './api';

const kindNames: Record<DeviceKind, string> = { light: '灯光', climate: '空调', cover: '窗帘', switch: '开关', sensor: '传感器' };
export function XiaomiConnection({ home, refresh }: { home: HomeSnapshot; refresh: () => Promise<void> }) {
  const [discovery, setDiscovery] = useState<XiaomiDiscovery | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [stale, setStale] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const imported = home.devices.filter((device) => device.integration === 'xiaomi_home');
  const message = error || (home.xiaomi.status === 'error' ? home.xiaomi.message : '');
  async function run(action: string, work: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(action); setError('');
    try { await work(); }
    catch (reason) { if (mounted.current) { setError(reason instanceof Error ? reason.message : '接入未完成，请重试。'); setStale(true); } }
    finally { await refresh(); pending.current = false; if (mounted.current) setBusy(''); }
  }
  function discover() {
    setStale(true);
    return run('discover', async () => {
      const result = await api<XiaomiDiscovery>('/connections/xiaomi/discover', 'POST');
      if (mounted.current) { setDiscovery(result); setSelected([]); setStale(false); }
    });
  }
  function importDevices() {
    return run('import', async () => {
      const result = await api<{ count: number }>('/connections/xiaomi/import', 'POST', { entityIds: selected });
      if (mounted.current) setSelected([]);
      notifications.show({ title: `已接入或更新 ${result.count} 项小米设备`, message: '现在可以通过设备卡片、场景或家居助手控制。', color: 'mint', icon: <Check size={16} /> });
    });
  }
  return <Stack gap="md">
    <Group justify="space-between" align="flex-start">
      <Group wrap="nowrap"><ThemeIcon variant="light" size={45} color="orange"><Cable size={23} /></ThemeIcon><div><Text fw={500}>小米 / 米家</Text><Text size="xs" c="dimmed">通过官方 Xiaomi Home 集成接入</Text></div></Group>
      <Badge color={home.xiaomi.status === 'error' ? 'red' : imported.length ? 'mint' : 'gray'} variant="light">{home.xiaomi.status === 'error' ? '连接异常' : imported.length ? `已接入 ${imported.length} 项` : '等待接入'}</Badge>
    </Group>
    <Text c="dimmed" size="sm">将米家中的灯光、空调、窗帘、开关和传感器接入栖居，统一手动控制、场景与 AI 对话。设备需先在 Home Assistant 中可用。</Text>
    <Accordion variant="contained" defaultValue={home.xiaomi.configured ? null : 'setup'}>
      <Accordion.Item value="setup"><Accordion.Control>接入准备与配置</Accordion.Control><Accordion.Panel>
        <Stack gap="sm">
          <Text size="sm">1. 在电脑、NAS 或家庭服务器上运行 Home Assistant，并安装 <Anchor href="https://github.com/XiaoMi/ha_xiaomi_home/blob/main/doc/README_zh.md" target="_blank" rel="noreferrer" size="sm">小米官方 Xiaomi Home 集成</Anchor>。</Text>
          <Text size="sm">2. 在 Home Assistant 中完成米家账号授权，选择与米家 App 一致的地区和家庭，确认能看到并控制设备。</Text>
          <Text size="sm">3. 在栖居服务端 .env 中填写中枢地址与管理员的长期访问令牌，然后重启栖居。</Text>
          <Code block>{'HA_URL=http://homeassistant.local:8123\nHA_TOKEN=你的管理员长期访问令牌'}</Code>
          <Text size="sm">4. 点击“发现小米设备”，勾选要接入的设备。新增设备需再次发现并选择。</Text>
          <Text size="xs" c="dimmed">米家登录在 Home Assistant 内完成。家庭中枢需保持运行；是否支持离线控制取决于小米设备与网关。此入口识别官方 xiaomi_home 集成，其他集成可通过 Home Assistant 通用入口接入。</Text>
        </Stack>
      </Accordion.Panel></Accordion.Item>
    </Accordion>
    {message && <Alert color="red" title="小米接入未完成" role="alert">{message}</Alert>}
    {!home.xiaomi.configured && <Alert color="gray">尚未配置家庭中枢。按上方步骤设置后，即可发现设备；当前模拟设备仍可正常使用。</Alert>}
    <Group gap="sm">
      <Button leftSection={<Search size={15} />} disabled={!home.xiaomi.configured || !!busy} loading={busy === 'discover'} onClick={() => void discover()}>发现小米设备</Button>
      <Button variant="light" leftSection={<RefreshCw size={15} />} disabled={!home.xiaomi.configured || !imported.length || !!busy} loading={busy === 'sync'} onClick={() => void run('sync', async () => {
        const result = await api<{ count: number; offline: number }>('/connections/xiaomi/sync', 'POST');
        notifications.show({ title: `已同步 ${result.count} 项小米设备`, message: result.offline ? `${result.offline} 项离线，已保留设备与场景。` : '已获取中枢中的最新状态。', color: result.offline ? 'orange' : 'mint' });
      })}>同步已接入</Button>
    </Group>
    <Text size="xs" c="dimmed">{message ? '恢复连接后，可重新发现或同步已接入设备。' : `${home.xiaomi.message}。状态在手动同步及控制后更新。`}</Text>
    {discovery && <>
      <Divider />
      <Group justify="space-between"><Text size="sm" fw={500}>发现结果</Text><Text size="xs" c="dimmed">{discovery.devices.length} 项可接入 · {discovery.unsupported.length} 项暂不可接入</Text></Group>
      {!discovery.total && <Alert color="gray">未发现官方集成中的设备。请在 Home Assistant 确认已安装 Xiaomi Home、米家授权已完成，并选择正确的地区和家庭。</Alert>}
      {discovery.devices.length > 0 && <>
        {stale && <Alert color="orange">发现结果可能已变化，请重新发现后再接入。已选项目会保留供核对。</Alert>}
        <Group justify="space-between"><Text size="xs" c="dimmed">已选 {selected.length} 项 · 每次最多 100 项</Text><Group gap="xs"><Button size="compact-xs" variant="subtle" disabled={!!busy || stale} onClick={() => setSelected(discovery.devices.slice(0, 100).map((device) => device.entityId!))}>{discovery.devices.length > 100 ? '选择前 100 项' : '全选'}</Button><Button size="compact-xs" variant="subtle" disabled={!!busy || !selected.length} onClick={() => setSelected([])}>清空</Button></Group></Group>
        <Checkbox.Group value={selected} onChange={setSelected} aria-label="选择要接入的小米设备">
          <Stack gap="sm">{discovery.devices.map((device) => <Checkbox key={device.id} value={device.entityId!} disabled={!!busy || stale || (selected.length >= 100 && !selected.includes(device.entityId!))}
            label={<Group gap={6}><Text size="sm">{device.name}</Text>{imported.some((item) => item.id === device.id) && <Badge size="xs" variant="light">已接入</Badge>}{!device.online && <Badge size="xs" color="gray">离线</Badge>}</Group>}
            description={`${device.room} · ${kindNames[device.kind]} · ${device.brand}${device.model ? ` · ${device.model}` : ''}`} />)}</Stack>
        </Checkbox.Group>
        <Button disabled={!selected.length || stale || !!busy} loading={busy === 'import'} onClick={() => void importDevices()}>接入所选设备{selected.length ? `（${selected.length}）` : ''}</Button>
      </>}
      {discovery.unsupported.length > 0 && <Accordion variant="contained"><Accordion.Item value="unsupported"><Accordion.Control>查看暂不可接入的 {discovery.unsupported.length} 项</Accordion.Control><Accordion.Panel><Stack gap="sm">{discovery.unsupported.map((device) => <div key={device.entityId}><Text size="sm">{device.name}</Text><Text size="xs" c="dimmed">{device.reason}</Text></div>)}</Stack></Accordion.Panel></Accordion.Item></Accordion>}
      <Text size="xs" c="dimmed">同一台设备可能提供多个控制项或传感器，以上按可独立操作的项目列出。接入本身不会开关设备。</Text>
    </>}
  </Stack>;
}
