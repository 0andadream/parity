import { createHash } from 'node:crypto';
import type { Json, Diff } from './types';
export function canonicalize(value: unknown): string {
 if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
 if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
 const object = value as Record<string, unknown>;
 return '{' + Object.keys(object).sort().filter(k => object[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonicalize(object[k])).join(',') + '}';
}
export const hash = (value: unknown) => createHash('sha256').update(canonicalize(value)).digest('hex');
export function diff(previous: Json, current: Json, path = ''): Diff[] {
 if (canonicalize(previous) === canonicalize(current)) return [];
 if (previous && current && typeof previous === 'object' && typeof current === 'object' && !Array.isArray(previous) && !Array.isArray(current)) {
  return [...new Set([...Object.keys(previous), ...Object.keys(current)])].sort().flatMap(k => diff(previous[k] ?? null, current[k] ?? null, path ? `${path}.${k}` : k));
 }
 return [{field:path, previous, current}];
}
// Slots, timings and routing telemetry are observations, not economic state.
export function stableRoute(route: Json[]): Json[] {
 return route.map(item => {
  const r = item as Record<string, Json>;
  const info = r.swapInfo as Record<string, Json> | undefined;
  return {percent:r.percent ?? null, bps:r.bps ?? null, swapInfo: info ? Object.fromEntries(Object.entries(info).filter(([key]) => key !== 'updateContextSlot')) : null};
 });
}
