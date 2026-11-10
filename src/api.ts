import { useCallback, useEffect, useRef, useState } from 'react';
import type { HomeSnapshot } from '../shared/types';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const token = sessionStorage.getItem('hub-token');
  let response: Response;
  try { response = await fetch(`/api${path}`, {
    method, headers: { ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(path === '/chat' ? 200000 : 90000),
  }); } catch { throw new ApiError('无法确认请求结果，请检查本地服务并刷新设备状态。', 0); }
  const result = await response.json();
  if (!response.ok) throw new ApiError(result.message || '请求失败，请重试。', response.status);
  return result as T;
}
export function useHome() {
  const [home, setHome] = useState<HomeSnapshot | null>(null);
  const [error, setError] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);
  const sequence = useRef(0);
  const mounted = useRef(true);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const data = await api<HomeSnapshot>('/home');
      if (mounted.current && current === sequence.current) { setHome(data); setError(''); setUnauthorized(false); }
    } catch (e) {
      if (mounted.current && current === sequence.current) { setError((e as Error).message); setUnauthorized(e instanceof ApiError && e.status === 401); }
    }
  }, []);
  useEffect(() => {
    mounted.current = true; void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 5000);
    return () => { mounted.current = false; sequence.current++; clearInterval(timer); };
  }, [refresh]);
  return { home, error, unauthorized, refresh };
}
