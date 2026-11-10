import { useEffect, useState } from 'react';
import { ActionIcon, Alert, Badge, Button, Card, Code, CopyButton, Divider, Drawer, Group, Loader, Modal, MultiSelect, NavLink, PasswordInput, Progress, Select, Stack, Tabs, Text, TextInput, ThemeIcon, Title, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Activity, ArrowRight, BedDouble, BookOpen, Cable, Check, CheckCheck, ChevronRight, Copy, Droplets, Film, House, LayoutDashboard, Leaf, Lightbulb, Monitor, Moon, Plus, RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, Sofa, Sparkles, Sun, Thermometer, Zap } from 'lucide-react';
import type { Changes, Device, HomeSnapshot, Scene, SceneResult } from '../shared/types';
import { api, useHome } from './api';
import { DeviceCard } from './DeviceCard';
import { FloorPlan } from './FloorPlan';
import { ChatPanel } from './ChatPanel';
import { XiaomiConnection } from './XiaomiConnection';

type View = 'overview' | 'devices' | 'scenes' | 'connections' | 'activity';
const views: { id: View; label: string; icon: typeof House }[] = [
  { id: 'overview', label: '全屋概览', icon: LayoutDashboard }, { id: 'devices', label: '所有设备', icon: SlidersHorizontal },
  { id: 'scenes', label: '智能场景', icon: Sparkles }, { id: 'connections', label: '接入与模型', icon: Cable }, { id: 'activity', label: '活动记录', icon: Activity },
];
const roomIcons: Record<string, typeof House> = { 客厅: Sofa, 主卧: BedDouble, 书房: Monitor, 厨房: House, 阳台: Leaf };
const sceneIcons = { home: House, movie: Film, moon: Moon };
function timeLabel(time: string) { return new Date(time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); }

export function App() {
  const { home, error, unauthorized, refresh } = useHome();
  const [view, setView] = useState<View>('overview');
  const [room, setRoom] = useState('全部');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [sceneOpen, setSceneOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [clock, setClock] = useState(new Date());
  const [token, setToken] = useState('');
  const [addName, setAddName] = useState('');
  const [addRoom, setAddRoom] = useState<string | null>('客厅');
  const [addKind, setAddKind] = useState<string | null>('light');
  const [sceneName, setSceneName] = useState('');
  const [sceneDevices, setSceneDevices] = useState<string[]>([]);
  const [newRoom, setNewRoom] = useState('');
  useEffect(() => { const timer = setInterval(() => setClock(new Date()), 30000); return () => clearInterval(timer); }, []);

  async function act(key: string, fn: () => Promise<unknown>, success?: string): Promise<boolean> {
    if (busy.includes(key)) return false;
    setBusy((items) => [...items, key]);
    try {
      const result = await fn() as Partial<SceneResult> | undefined;
      if (result?.status === 'partial' || result?.status === 'failed') throw new Error('场景未全部完成，后续操作已停止。请在活动记录中查看结果。');
      if (success) notifications.show({ title: success, message: '状态已更新', color: 'mint', icon: <Check size={16} /> });
      return true;
    } catch (e) { notifications.show({ title: '操作未完成', message: (e as Error).message, color: 'red', autoClose: false }); return false; }
    finally { await refresh(); setBusy((items) => items.filter((item) => item !== key)); }
  }
  function control(device: Device, changes: Changes) { return act(device.id, () => api('/control', 'POST', { deviceId: device.id, changes })); }
  function runScene(scene: Scene) { return act(scene.id, () => api(`/scenes/${scene.id}/run`, 'POST'), `${scene.name}已执行`); }
  function showRoom(next: string) { setRoom(next); setQuery(''); setView('overview'); }
  function showDetails(device: Device) { setDetailsId(device.id); setNewRoom(device.room); }

  if (unauthorized) return <div className="loading-screen"><Card w={360} maw="90vw"><House size={28} /><Title order={3} mt="md">连接到栖居</Title><Text c="dimmed" size="sm" my="md">请输入服务端设置的 Home Hub 访问令牌。</Text><form onSubmit={(event) => { event.preventDefault(); sessionStorage.setItem('hub-token', token); void refresh(); }}><PasswordInput aria-label="访问令牌" value={token} onChange={(e) => setToken(e.currentTarget.value)} /><Button type="submit" fullWidth mt="md">连接</Button></form><Text c="red.3" size="xs" mt="sm">{error}</Text></Card></div>;
  if (!home) return <div className="loading-screen"><House size={32} /><Title order={3}>栖居 · Home Hub</Title>{error ? <><Text c="red.3">{error}</Text><Button onClick={() => void refresh()}>重新连接</Button></> : <Loader color="mint" size="sm" />}</div>;

  const rooms = [...new Set(home.devices.map((device) => device.room))];
  const filtered = home.devices.filter((d) => (room === '全部' || d.room === room) && `${d.name} ${d.brand} ${d.room}`.toLowerCase().includes(query.toLowerCase()));
  const detail = home.devices.find((d) => d.id === detailsId);
  const online = home.devices.filter((d) => d.online).length;
  const on = home.devices.filter((d) => d.online && d.state.power).length;
  const temperatures = home.devices.filter((d) => d.online && d.state.currentTemperature !== undefined).map((d) => d.state.currentTemperature!);
  const temperature = temperatures.length ? (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1) : '—';
  const humidity = home.devices.find((d) => d.online && d.state.humidity !== undefined)?.state.humidity;
  const currentTitle = view === 'overview' ? room === '全部' ? '家的每一刻，都刚刚好。' : `${room}，自在的日常。` : views.find((v) => v.id === view)!.label;
  const deviceCard = (device: Device) => <DeviceCard key={device.id} device={device} pending={busy.includes(device.id)} onChange={(changes) => control(device, changes)} onDetails={() => showDetails(device)} />;
  const sceneTile = (scene: Scene) => { const Icon = sceneIcons[scene.icon]; return <Button key={scene.id} className={`scene-tile scene-${scene.icon}`} variant="default" h="auto" loading={busy.includes(scene.id)} onClick={() => void runScene(scene)}><div className="scene-tile-inner"><div className="scene-icon"><Icon size={21} strokeWidth={1.7} /></div><div><Text size="sm" fw={500}>{scene.name}</Text><Text size="11px" c="dimmed" mt={4}>{scene.actions.length} 项设备调整</Text></div><ChevronRight size={15} className="scene-arrow" /></div></Button>; };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon"><House size={23} strokeWidth={1.8} /></span><span>栖居 <small>HOME HUB</small></span></div>
      <div className="clock-block"><div className="clock">{timeLabel(clock.toISOString())}</div><Text size="sm" c="dimmed">{clock.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</Text></div>
      <div className="home-status"><div className="status-symbol"><Sun size={31} strokeWidth={1.2} /></div><div><Text size="sm">{!home.devices.length ? '等待接入设备' : online < home.devices.length ? '部分设备离线' : '家中一切就绪'}</Text><Text size="xs" c="dimmed" mt={3}>{online} 个设备在线 · {on} 个已开启</Text></div></div>
      <nav className="main-nav" aria-label="主导航">{views.map(({ id, label, icon: Icon }) => <NavLink component="button" type="button" key={id} active={view === id} label={label} leftSection={<Icon size={18} strokeWidth={1.7} />} rightSection={id === 'devices' ? <span className="nav-count">{home.devices.length}</span> : undefined} onClick={() => { setView(id); if (id === 'devices' || id === 'overview') setRoom('全部'); if (id === 'overview') setQuery(''); }} />)}</nav>
      <div className="room-nav"><Text className="nav-section-label" size="10px" c="dimmed">空间 / ROOMS</Text>{rooms.map((name) => { const Icon = roomIcons[name] || House; return <NavLink component="button" type="button" key={name} active={view === 'overview' && room === name} label={name} leftSection={<Icon size={17} strokeWidth={1.6} />} rightSection={<Text size="xs" c="dimmed">{home.devices.filter((d) => d.room === name).length}</Text>} onClick={() => showRoom(name)} />; })}</div>
      <div className="environment"><div><Group gap={6}><Thermometer size={14} /><Text size="xs">室内均温</Text></Group><div className="environment-number">{temperature}<span>°C</span></div><div className="ambient-line temp-line" /></div><div><Group gap={6}><Droplets size={14} /><Text size="xs">室内湿度</Text></Group><div className="environment-number">{humidity ?? '—'}<span>%</span></div><Progress value={humidity ?? 0} size={3} color="mint.5" /></div></div>
      <div className="sidebar-footer"><span className="status-dot" /><Text size="xs">{error ? '本地服务连接异常' : '本地服务已连接'}</Text><Tooltip label="接入与模型设置"><ActionIcon size="sm" ml="auto" aria-label="打开设置" onClick={() => setView('connections')}><Settings2 size={15} /></ActionIcon></Tooltip></div>
    </aside>

    <main className="main-content">
      <header className="page-header"><div><Text className="eyebrow" size="10px" c="dimmed">MY HOME / {views.find((v) => v.id === view)?.label}</Text><h1>{currentTitle}</h1></div><Group gap={12}><Badge variant="dot" color="mint" size="sm">{home.devices.some((d) => d.adapter === 'demo') ? '模拟体验' : '本地控制'}</Badge><Tooltip label="刷新设备状态"><ActionIcon aria-label="刷新设备状态" onClick={() => void refresh()}><RefreshCw size={17} /></ActionIcon></Tooltip><Button variant="light" leftSection={<Plus size={16} />} onClick={() => setAddOpen(true)}>接入设备</Button></Group></header>
      {error && <Alert color="red" mb="md" title="连接中断" role="alert">{error} <Button variant="subtle" size="xs" onClick={() => void refresh()}>重试</Button></Alert>}
      <div className="board-layout">
        <section className="primary-column">
          {view === 'overview' && <>
            <div className="section-heading"><Group gap={8}><House size={17} /><Text size="sm" fw={500}>全屋平面图</Text></Group><Text size="xs" c="dimmed">{rooms.length} 个空间 · {home.devices.length} 个设备</Text></div>
            <FloorPlan devices={home.devices} selected={room} onRoom={showRoom} />
            <div className="section-heading"><Group gap={8}><Zap size={17} /><Text size="sm" fw={500}>一刻，切换一种生活</Text></Group><Button variant="subtle" size="compact-xs" color="gray" onClick={() => setView('scenes')}>全部场景 <ArrowRight size={13} /></Button></div>
            <div className="scene-grid">{home.scenes.slice(0, 3).map(sceneTile)}</div>
            {!home.scenes.length && <Card><Text c="dimmed" size="sm">还没有场景，在“智能场景”中保存设备的当前状态。</Text></Card>}
            <div className="section-heading"><Group gap={8}><Activity size={17} /><Text size="sm" fw={500}>最近活动</Text></Group><Button variant="subtle" size="compact-xs" color="gray" onClick={() => setView('activity')}>查看全部 <ArrowRight size={13} /></Button></div>
            <Card className="activity-card">{home.events.length ? home.events.slice(0, 3).map((event) => <div className="activity-row" key={event.id}><span className={`event-dot ${event.status}`} /><div><Text size="xs">{event.label} <span className="muted">· {event.detail}</span></Text><Text size="10px" c="dimmed" mt={3}>{event.source === 'agent' ? '家居助手' : event.source === 'scene' ? '场景执行' : '手动操作'} · {event.status === 'success' ? '已完成' : event.status === 'pending' ? '执行中' : '未完成或待确认'}</Text></div><Text size="10px" c="dimmed" ml="auto">{timeLabel(event.time)}</Text></div>) : <div className="empty-inline"><CheckCheck size={20} /><Text size="xs" c="dimmed">从一次小小的调整开始，家的变化会记录在这里。</Text></div>}</Card>
          </>}
          {view === 'devices' && <>
            <Group justify="space-between" mb="md"><TextInput placeholder="搜索设备、品牌或房间" aria-label="搜索设备" leftSection={<Search size={16} />} value={query} onChange={(event) => setQuery(event.currentTarget.value)} style={{ flex: 1 }} /><Select aria-label="按房间筛选" w={120} value={room} data={['全部', ...rooms]} onChange={(value) => setRoom(value || '全部')} /></Group>
            <div className="all-devices-grid">{filtered.map(deviceCard)}</div>{!filtered.length && <Card><Text c="dimmed">没有匹配的设备。尝试切换房间或接入新设备。</Text></Card>}
          </>}
          {view === 'scenes' && <>
            <Card mb="lg" className="scene-intro"><Sparkles size={30} /><h2>为每种日常，留一个开关。</h2><Text c="dimmed" size="sm" mb="lg">把多个设备的当前状态保存为场景，下次一键恢复。</Text><Button leftSection={<Plus size={16} />} onClick={() => setSceneOpen(true)}>保存当前状态为场景</Button></Card>
            <div className="scenes-list">{home.scenes.map((scene) => <Card key={scene.id}><Group justify="space-between" mb="sm"><Group><ThemeIcon variant="light" size="lg">{(() => { const Icon = sceneIcons[scene.icon]; return <Icon size={20} />; })()}</ThemeIcon><div><Text fw={500}>{scene.name}</Text><Text size="xs" c="dimmed">{scene.description}</Text></div></Group><Button variant="light" loading={busy.includes(scene.id)} onClick={() => void runScene(scene)}>执行场景</Button></Group><Divider my="md" /><Stack gap={7}>{scene.actions.map((action, index) => <Group justify="space-between" key={index}><Text size="xs">{home.devices.find((d) => d.id === action.deviceId)?.name ?? action.deviceId}</Text><Text size="xs" c="dimmed">{formatChanges(action.changes)}</Text></Group>)}</Stack></Card>)}</div>
          </>}
          {view === 'connections' && <Connections home={home} refresh={refresh} syncing={busy.includes('sync')} onSync={() => void act('sync', () => api('/connections/home-assistant/sync', 'POST'), '设备同步完成')} />}
          {view === 'activity' && <Card><Group justify="space-between" mb="lg"><Text fw={500}>每一次调整，都有迹可循</Text><Badge color="gray" variant="light">最近 {home.events.length} 条</Badge></Group>{home.events.map((event) => <div className="activity-row expanded" key={event.id}><ThemeIcon variant="light" color={event.status === 'success' ? 'mint' : 'orange'} size="md">{event.source === 'agent' ? <Sparkles size={15} /> : <Activity size={15} />}</ThemeIcon><div><Text size="sm">{event.label}</Text><Text size="xs" c="dimmed" mt={4}>{event.detail}</Text><Text size="10px" c="dimmed" mt={4}>{event.source === 'agent' ? 'AI / 本地指令' : event.source === 'scene' ? '场景' : '手动'} · {new Date(event.time).toLocaleString('zh-CN')}</Text></div><Badge ml="auto" size="xs" variant="light" color={event.status === 'success' ? 'mint' : 'orange'}>{event.status === 'success' ? '已完成' : event.status === 'pending' ? '执行中' : event.status === 'failed' ? '失败' : '待确认'}</Badge></div>)}{!home.events.length && <Text c="dimmed" ta="center" py="xl">暂无操作记录</Text>}</Card>}
        </section>
        <aside className="right-column">
          {view === 'overview' && <><div className="section-heading"><Group gap={8}><SlidersHorizontal size={17} /><Text size="sm" fw={500}>{room === '全部' ? '设备速控' : `${room}设备`}</Text></Group><Select aria-label="速控房间" variant="unstyled" size="xs" w={85} data={['全部', ...rooms]} value={room} onChange={(value) => setRoom(value || '全部')} /></div><div className="quick-devices-grid">{filtered.filter((d) => d.kind !== 'sensor').slice(0, room === '全部' ? 4 : 6).map(deviceCard)}</div>{!filtered.length && <Text c="dimmed" size="sm">这个空间还没有设备。</Text>}<Button variant="subtle" color="gray" size="xs" rightSection={<ArrowRight size={13} />} onClick={() => setView('devices')} fullWidth mb="md">查看{room === '全部' ? '全部' : room}设备</Button></>}
          <ChatPanel home={home} refresh={refresh} />
          <div className="privacy-note"><ShieldCheck size={14} /><Text size="10px" c="dimmed">设备状态保存在本地 · 模型接入后按需发送上下文</Text></div>
        </aside>
      </div>
      <footer className="main-footer"><Text size="10px" c="dimmed">HOME HUB · 让设备互联，让生活自然。</Text><Text size="10px" c="dimmed">{home.devices.some((d) => d.adapter === 'demo') ? '含模拟设备数据，请以设备来源为准' : '设备数据来自已连接的家庭中枢'}</Text></footer>
    </main>

    <Modal opened={addOpen} onClose={() => setAddOpen(false)} title="接入你的设备" size="md">
      <Tabs defaultValue={home.demo ? 'demo' : 'xiaomi'} keepMounted={false}><Tabs.List mb="lg">{home.demo && <Tabs.Tab value="demo" leftSection={<Lightbulb size={15} />}>模拟设备</Tabs.Tab>}<Tabs.Tab value="xiaomi" leftSection={<Cable size={15} />}>小米 / 米家</Tabs.Tab><Tabs.Tab value="ha">Home Assistant</Tabs.Tab></Tabs.List>
        <Tabs.Panel value="demo"><Text c="dimmed" size="sm" mb="lg">创建一个可控制的虚拟设备，体验完整流程。这里的设备不会连接真实硬件。</Text><form onSubmit={async (event) => { event.preventDefault(); if (await act('add', () => api('/devices', 'POST', { name: addName, room: addRoom, kind: addKind }), '模拟设备已添加')) { setAddOpen(false); setAddName(''); setView('devices'); setRoom('全部'); } }}><Stack><TextInput label="设备名称" placeholder="例如：阅读灯" required maxLength={40} value={addName} onChange={(event) => setAddName(event.currentTarget.value)} /><Select label="所在房间" data={[...new Set([...rooms, '客厅', '主卧', '书房', '厨房', '阳台'])]} value={addRoom} onChange={setAddRoom} required /><Select label="设备类型" data={[{ value: 'light', label: '灯光 · 开关与亮度' }, { value: 'climate', label: '空调 · 开关与温度' }, { value: 'cover', label: '窗帘 · 开合比例' }, { value: 'switch', label: '插座 · 电源开关' }, { value: 'sensor', label: '传感器 · 温湿度' }]} value={addKind} onChange={setAddKind} required /><Button type="submit" loading={busy.includes('add')} disabled={!addName.trim() || !addRoom || !addKind}>添加设备</Button></Stack></form></Tabs.Panel>
        <Tabs.Panel value="ha"><Text size="sm" c="dimmed" mb="lg">先在服务端 .env 配置 HA_URL 与 HA_TOKEN，重启服务后同步。密钥不会发送到浏览器。当前支持灯光、空调、窗帘、开关和只读传感器。</Text><Badge mb="md" color={home.connection.configured ? 'mint' : 'gray'}>{home.connection.message}</Badge><Button fullWidth disabled={!home.connection.configured} loading={busy.includes('sync')} onClick={() => void act('sync', () => api('/connections/home-assistant/sync', 'POST'), '设备同步完成')}>同步 Home Assistant 设备</Button></Tabs.Panel>
        <Tabs.Panel value="xiaomi"><XiaomiConnection home={home} refresh={refresh} /></Tabs.Panel>
      </Tabs>
    </Modal>
    <Modal opened={sceneOpen} onClose={() => setSceneOpen(false)} title="保存一个生活场景">
      <form onSubmit={async (event) => { event.preventDefault(); const actions = home.devices.filter((d) => sceneDevices.includes(d.id)).map((d) => ({ deviceId: d.id, changes: captureState(d) })); if (await act('create-scene', () => api('/scenes', 'POST', { name: sceneName, description: '恢复保存的设备状态', icon: 'home', actions }), '场景已保存')) { setSceneOpen(false); setSceneName(''); setSceneDevices([]); } }}><Stack><Text size="sm" c="dimmed">先在设备卡片调整到理想状态，再选择要保存的设备。</Text><TextInput label="场景名称" required maxLength={30} value={sceneName} onChange={(event) => setSceneName(event.currentTarget.value)} placeholder="例如：专注阅读" /><MultiSelect label="包含的设备" required searchable data={home.devices.filter((d) => d.online && d.capabilities.length).map((d) => ({ value: d.id, label: `${d.room} · ${d.name}` }))} value={sceneDevices} onChange={setSceneDevices} /><Button type="submit" disabled={!sceneName.trim() || !sceneDevices.length} loading={busy.includes('create-scene')}>保存当前状态</Button></Stack></form>
    </Modal>
    <Drawer opened={!!detail} onClose={() => setDetailsId(null)} title="设备详情" position="right" size={380}>
      {detail && <Stack>{deviceCard(detail)}<Group justify="space-between"><Text size="sm" c="dimmed">来源</Text><Badge variant="light">{detail.adapter === 'demo' ? '模拟设备' : detail.integration === 'xiaomi_home' ? '小米 · Home Assistant' : 'Home Assistant'}</Badge></Group>{detail.model && <Text size="sm" c="dimmed">型号：{detail.model}</Text>}<Text size="xs" c="dimmed">最后更新：{new Date(detail.updatedAt).toLocaleString('zh-CN')}</Text><TextInput label="所在房间" value={newRoom} maxLength={20} onChange={(e) => setNewRoom(e.currentTarget.value)} /><Button disabled={!newRoom.trim() || newRoom.trim() === detail.room} loading={busy.includes('room')} onClick={() => void act('room', () => api(`/devices/${encodeURIComponent(detail.id)}`, 'PATCH', { room: newRoom }), '房间已更新')}>保存房间</Button><Divider /><Text size="xs" c="dimmed">设备标识</Text><Code block>{detail.id}</Code></Stack>}
    </Drawer>
  </div>;
}

function captureState(device: Device): Changes {
  if (device.state.power === false && device.capabilities.includes('power')) return { power: false };
  return Object.fromEntries(device.capabilities.filter((key) => device.state[key] !== undefined).map((key) => [key, device.state[key]]));
}
function formatChanges(changes: Changes) { return [changes.power === undefined ? '' : changes.power ? '开启' : '关闭', changes.brightness === undefined ? '' : `亮度 ${changes.brightness}%`, changes.temperature === undefined ? '' : `${changes.temperature}°C`, changes.position === undefined ? '' : `开度 ${changes.position}%`].filter(Boolean).join(' · '); }

function Connections({ home, refresh, syncing, onSync }: { home: HomeSnapshot; refresh: () => Promise<void>; syncing: boolean; onSync: () => void }) {
  return <Stack gap="lg">
    <Card><XiaomiConnection home={home} refresh={refresh} /></Card>
    <Card><Group justify="space-between"><Group><ThemeIcon variant="light" size={45}><Cable size={23} /></ThemeIcon><div><Text fw={500}>Home Assistant</Text><Text size="xs" c="dimmed">一个入口，连接不同品牌与协议</Text></div></Group><Badge color={home.connection.status === 'connected' ? 'mint' : 'gray'} variant="light">{home.connection.status === 'connected' ? '已连接' : home.connection.configured ? '待同步' : '未配置'}</Badge></Group><Text c="dimmed" size="sm" my="lg">通过家庭中枢统一接入设备。同步会导入中枢中全部受支持的设备。只接入小米设备时，请使用上方的小米专用入口；无线配对在中枢中完成。</Text><Code block>HA_URL=http://homeassistant.local:8123{'\n'}HA_TOKEN=你的长期访问令牌</Code><Group justify="space-between" mt="lg"><Text size="xs" c="dimmed">{home.connection.message}</Text><Button variant="light" disabled={!home.connection.configured} loading={syncing} onClick={onSync}>同步所有设备</Button></Group></Card>
    <Card><Group justify="space-between"><Group><ThemeIcon variant="light" size={45} color="grape"><Sparkles size={23} /></ThemeIcon><div><Text fw={500}>对话模型</Text><Text size="xs" c="dimmed">兼容 Chat Completions 工具调用接口</Text></div></Group><Badge color={home.agent.mode === 'model' ? 'mint' : 'gray'} variant="light">{home.agent.mode === 'model' ? home.agent.model : '本地指令模式'}</Badge></Group><Text c="dimmed" size="sm" my="lg">在服务端 .env 中填写以下配置并重启，即可从固定指令切换到自然语言理解。模型需要支持 function calling；设备状态与最近对话会发送给配置的模型服务。</Text><Code block>AI_BASE_URL=https://你的模型服务/v1{'\n'}AI_API_KEY=你的密钥{'\n'}AI_MODEL=模型名称</Code></Card>
    <Card><Group><ThemeIcon variant="light" size={45} color="blue"><BookOpen size={23} /></ThemeIcon><div><Text fw={500}>开放给你的 Agent</Text><Text size="xs" c="dimmed">MCP 标准输入输出 · 统一设备工具</Text></div></Group><Text c="dimmed" size="sm" my="lg">启动 Home Hub 后，让 Agent 通过 MCP 读取设备、执行控制和切换场景。所有操作使用同一套校验，并写入活动记录。</Text><Group justify="space-between"><Code>npm run --silent mcp</Code><CopyButton value="npm run --silent mcp">{({ copied, copy }) => <Button variant="subtle" size="xs" onClick={copy} leftSection={copied ? <Check size={14} /> : <Copy size={14} />}>{copied ? '已复制' : '复制命令'}</Button>}</CopyButton></Group><Text size="xs" c="dimmed" mt="md">完整配置见项目 docs/development.md。远程访问需配置 HUB_API_TOKEN。</Text></Card>
  </Stack>;
}
