import { ActionIcon, Badge, Button, Card, Group, Loader, Text, Textarea } from '@mantine/core';
import { ArrowUp, Bot, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { HomeSnapshot } from '../shared/types';
import { api } from './api';

export function ChatPanel({ home, refresh }: { home: HomeSnapshot; refresh: () => Promise<void> }) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [home.messages.length, pending]);
  async function send(message: string) {
    if (!message.trim() || pending) return;
    setPending(true); setError('');
    try { await api('/chat', 'POST', { message }); setDraft(''); }
    catch (e) { setError((e as Error).message); }
    finally { await refresh(); setPending(false); }
  }
  return <Card className="chat-panel">
    <Group justify="space-between" mb="md"><Group gap={9}><Sparkles size={19} color="#9bd6bc" /><Text fw={500}>家的 AI 助手</Text></Group><Badge size="xs" color={home.agent.mode === 'local' ? 'gray' : 'mint'} variant="light">{home.agent.mode === 'local' ? '本地指令' : 'AI 已连接'}</Badge></Group>
    <div className="chat-scroll" ref={scroll} role="log" aria-label="与家居助手的对话" aria-live="polite">
      {!home.messages.length && <div className="chat-welcome"><div className="assistant-avatar"><Bot size={24} strokeWidth={1.5} /></div><Text size="sm" fw={500} mt={12}>把琐碎交给我，把时间留给生活。</Text><Text size="xs" c="dimmed" mt={8} lh={1.8}>{home.agent.mode === 'local' ? '试试下面的指令。接入 AI 模型后，可以用更自然的方式描述你的需求。' : '告诉我你想怎样度过这一刻，我会读取设备状态，为你调整家里的环境。'}</Text></div>}
      {home.messages.map((message) => <div className={`chat-message ${message.role}`} key={message.id}><div className="message-label">{message.role === 'user' ? '你' : '栖居助手'}</div><Text size="sm" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.content}</Text>{!!message.actions?.length && <div className="action-receipts">{message.actions.map((action, index) => <Text key={index} size="xs">{action}</Text>)}</div>}</div>)}
      {pending && <Group gap="xs" className="chat-thinking"><Loader size="xs" /><Text size="xs" c="dimmed">正在理解并处理…</Text></Group>}<div ref={end} />
    </div>
    <div className="chat-suggestions">{['观影模式', '关闭客厅主灯', '查看家里状态'].map((prompt) => <Button key={prompt} size="compact-xs" variant="default" disabled={pending} onClick={() => void send(prompt)}>{prompt}</Button>)}</div>
    {error && <Text c="red.3" size="xs" mb={8} role="alert">{error}</Text>}
    <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
      <Textarea aria-label="给家居助手发送消息" placeholder="告诉我，你想怎么调整家…" autosize minRows={1} maxRows={4} value={draft} onChange={(event) => setDraft(event.currentTarget.value)} maxLength={2000} disabled={pending} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(draft); } }} />
      <ActionIcon type="submit" variant="filled" color="mint.4" loading={pending} disabled={!draft.trim()} aria-label="发送消息"><ArrowUp size={18} /></ActionIcon>
    </form>
    <Text c="dimmed" size="10px" ta="center" mt={9}>{home.agent.mode === 'local' ? '本地规则解析 · 未连接大语言模型' : `${home.agent.model} · 操作结果可在活动记录中查看`}</Text>
  </Card>;
}
