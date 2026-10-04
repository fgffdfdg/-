'use client';

import type { DeclarationParty } from './types';

const STORAGE_KEY = 'saved_consignees';

export interface SavedConsignee {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  savedAt: string;
}

function getAll(): SavedConsignee[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedConsignee[]) : [];
  } catch {
    return [];
  }
}

function saveAll(list: SavedConsignee[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listSavedConsignees(): SavedConsignee[] {
  return getAll();
}

export function saveConsignee(party: DeclarationParty): SavedConsignee {
  const list = getAll();
  // 同名同 code 视为同一收货人，覆盖更新
  const existing = list.findIndex(
    (c) => c.name === party.name && c.code === party.code,
  );
  const item: SavedConsignee = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: party.name || '',
    code: party.code || '',
    address: party.address || '',
    phone: party.phone || '',
    savedAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    list[existing] = item;
  } else {
    list.unshift(item);
  }
  // 最多保留 50 条
  saveAll(list.slice(0, 50));
  return item;
}

export function deleteSavedConsignee(id: string): void {
  saveAll(getAll().filter((c) => c.id !== id));
}

export function toDeclarationParty(item: SavedConsignee): DeclarationParty {
  return {
    name: item.name,
    code: item.code,
    address: item.address,
    phone: item.phone,
  };
}