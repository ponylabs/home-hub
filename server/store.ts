import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AuditEvent, ChatMessage, Device, Scene } from '../shared/types.js';
import { demoDevices, demoScenes } from './seed.js';

export class Store {
  readonly db: DatabaseSync;
  constructor(path: string, demo = true) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS documents (collection TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(collection,id));
      CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
    if (demo && !this.db.prepare("SELECT value FROM metadata WHERE key='demo-seeded'").get()) {
      this.db.exec('BEGIN');
      try {
        for (const device of demoDevices()) this.put('devices', device);
        for (const scene of demoScenes) this.put('scenes', scene);
        this.db.prepare("INSERT INTO metadata VALUES ('demo-seeded','1')").run();
        this.db.exec('COMMIT');
      } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    }
    for (const event of this.list<AuditEvent>('events')) {
      if (event.status === 'pending') this.put('events', { ...event, status: 'uncertain', detail: '服务重启前未确认结果，请检查设备状态。' });
    }
  }
  list<T>(collection: string): T[] {
    return (this.db.prepare('SELECT body FROM documents WHERE collection=? ORDER BY rowid').all(collection) as { body: string }[]).map((row) => JSON.parse(row.body) as T);
  }
  get<T>(collection: string, id: string): T | undefined {
    const row = this.db.prepare('SELECT body FROM documents WHERE collection=? AND id=?').get(collection, id) as { body: string } | undefined;
    return row ? JSON.parse(row.body) as T : undefined;
  }
  put<T extends { id: string }>(collection: string, item: T): T {
    this.db.prepare('INSERT INTO documents VALUES (?,?,?) ON CONFLICT(collection,id) DO UPDATE SET body=excluded.body').run(collection, item.id, JSON.stringify(item));
    return item;
  }
  remove(collection: string, id: string) { this.db.prepare('DELETE FROM documents WHERE collection=? AND id=?').run(collection, id); }
  trim(collection: string, keep: number) {
    this.db.prepare('DELETE FROM documents WHERE collection=? AND rowid NOT IN (SELECT rowid FROM documents WHERE collection=? ORDER BY rowid DESC LIMIT ?)').run(collection, collection, keep);
  }
  devices() { return this.list<Device>('devices'); }
  scenes() { return this.list<Scene>('scenes'); }
  event(source: AuditEvent['source'], label: string, status: AuditEvent['status'], detail: string) {
    const event = this.put('events', { id: randomUUID(), time: new Date().toISOString(), source, label, status, detail });
    this.trim('events', 200);
    return event;
  }
  message(role: ChatMessage['role'], content: string, actions?: string[]) {
    const message = this.put('messages', { id: randomUUID(), role, content, time: new Date().toISOString(), actions });
    this.trim('messages', 100);
    return message;
  }
  close() { this.db.close(); }
}
