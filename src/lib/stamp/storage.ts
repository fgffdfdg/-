import { SavedStamp } from './types';

const STORAGE_KEY = 'exportdrive_stamps';

export function getStamps(): SavedStamp[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function getStamp(id: string): SavedStamp | undefined {
  return getStamps().find(s => s.id === id);
}

export function saveStamp(stamp: SavedStamp): void {
  const stamps = getStamps();
  const idx = stamps.findIndex(s => s.id === stamp.id);
  if (idx >= 0) stamps[idx] = stamp;
  else stamps.push(stamp);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stamps));
}

export function deleteStamp(id: string): void {
  const stamps = getStamps().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stamps));
}

export function generateId(): string {
  return `stamp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
