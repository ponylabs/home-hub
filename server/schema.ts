import { z } from 'zod';

export class HubError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
export const changesSchema = z.object({
  power: z.boolean().optional(),
  brightness: z.number().int().min(0).max(100).optional(),
  temperature: z.number().min(5).max(40).optional(),
  position: z.number().int().min(0).max(100).optional(),
}).strict().refine((v) => Object.keys(v).length > 0, '至少指定一项控制参数');
export const commandSchema = z.object({ deviceId: z.string().min(1).max(200), changes: changesSchema }).strict();
export const xiaomiImportSchema = z.object({ entityIds: z.array(z.string().min(1).max(200)).min(1).max(100)
  .refine((ids) => new Set(ids).size === ids.length) }).strict();
export const addDeviceSchema = z.object({
  name: z.string().trim().min(1).max(40),
  room: z.string().trim().min(1).max(20),
  kind: z.enum(['light', 'climate', 'cover', 'switch', 'sensor']),
}).strict();
export const sceneSchema = z.object({
  name: z.string().trim().min(1).max(30),
  description: z.string().trim().max(100).default('自定义场景'),
  icon: z.enum(['home', 'movie', 'moon']).default('home'),
  actions: z.array(commandSchema).min(1).max(30),
}).strict();
