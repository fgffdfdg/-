/** 印章本地存储（localStorage），用于跨预录单复用 */

export interface SavedStamp {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  createdAt: string;
}

const STORAGE_KEY = 'exportdrive_saved_stamps';

function getAll(): SavedStamp[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedStamp[]) : [];
  } catch {
    return [];
  }
}

function saveAll(list: SavedStamp[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota exceeded */
  }
}

export function listSavedStamps(): SavedStamp[] {
  return getAll();
}

export function addSavedStamp(name: string, dataUrl: string, width: number, height: number): SavedStamp {
  const stamps = getAll();
  const stamp: SavedStamp = {
    id: `stamp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    dataUrl,
    width,
    height,
    createdAt: new Date().toISOString(),
  };
  stamps.unshift(stamp);
  // 最多保留 20 个
  if (stamps.length > 20) stamps.length = 20;
  saveAll(stamps);
  return stamp;
}

export function removeSavedStamp(id: string): void {
  saveAll(getAll().filter((s) => s.id !== id));
}