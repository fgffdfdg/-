/**
 * 出口许可证模块本地存储工具
 *
 * 设计：
 * - 文件（PDF/图片）使用 IndexedDB 存储，避免 localStorage 5MB 上限
 * - 元数据（不含文件本体）使用 localStorage 同步读取，列表渲染无异步
 * - 仅用于本浏览器内的草稿与已签发证保存；正式的团队协作/跨端同步后续接 Supabase Storage
 *
 * ═══════════════════════════════════════════════════════════════
 * 迁移指引：旧类型 LicensePartyProfile 已标记 @deprecated，
 * 新代码请使用领域模型 `Party`（@/lib/domain/party.ts）。
 * ═══════════════════════════════════════════════════════════════
 */

// ─── 类型定义 ────────────────────────────────────────────────────

export interface LicenseDraft {
  id: string;
  no: string; // 草单/许可证编号
  title: string; // 草单名称
  exporter: string; // 出口商
  country: string; // 进口国
  vehicleCount: number; // 车辆数
  totalAmount: number; // 总值 USD
  status: 'draft' | 'submitted';
  createdAt: number;
  updatedAt: number;
  /** 合同号（冗余自 main.contractNo，便于检索与列表展示） */
  contractNo?: string;
  /** VIN 列表（一份草单可对应多辆车，VIN 来自附加表，多 VIN 时保存时以数组落库） */
  vins?: string[];
  /** 品牌名（冗余自 annex.brandCn / brandEn，便于列表展示） */
  brand?: string;
  /** 车型/车名（冗余自 annex.modelCn / modelEn，便于列表展示） */
  model?: string;
  /** 云端记录 ID（有值 = 已同步到云端，无值 = 仅本地） */
  cloudId?: string;
  main: unknown; // ExportLicenseMainData
  annex: unknown; // ExportLicenseData
}

export type IssuedLicenseFileType = 'pdf' | 'image' | 'other';

export interface IssuedLicense {
  id: string;
  licenseNo: string; // 出口许可证号
  fileName: string; // 原始文件名
  fileType: IssuedLicenseFileType;
  fileMime: string;
  fileSize: number;
  vins: string[]; // 关联的全部 VIN（一证多车时多个）
  exporter?: string;
  issueDate?: string; // 发证日期 YYYY-MM-DD
  note?: string;
  createdAt: number;
  // 内部字段：IndexedDB 中 Blob 对应的 key，等于 id
  __fileKey?: string;
}

// ─── 常量 ────────────────────────────────────────────────────────

const DRAFTS_KEY = 'export-license:drafts';
const ISSUED_KEY = 'export-license:issued';
const LAST_EXPORTER_KEY = 'export-license:last-exporter';
const PARTIES_KEY = 'export-license:parties';
const GOODS_KEY = 'export-license:goods';
const OWNERS_KEY = 'export-license:owners';
const LAST_MAIN_KEY = 'export-license:last-main';
const LAST_ANNEX_KEY = 'export-license:last-annex';
const DB_NAME = 'export-license-db';
const DB_VERSION = 1;
const STORE_FILES = 'files';

// ─── 工具方法 ────────────────────────────────────────────────────

function uid(prefix = ''): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}${t}${r}`;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('[license-storage] writeJSON failed:', err);
    throw new Error('本地存储空间不足，请清理浏览器数据后重试');
  }
}

function detectFileType(name: string, mime: string): IssuedLicenseFileType {
  const lower = name.toLowerCase();
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(lower))
    return 'image';
  return 'other';
}

/** 把任意输入拆分成 VIN 数组（支持换行、逗号、空格、分号、制表符） */
export function parseVins(input: string | string[] | undefined | null): string[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input.join('\n') : input;
  const tokens = raw
    .toUpperCase()
    .split(/[\s,;，；、\t\r\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  // 去重
  return Array.from(new Set(tokens));
}

// ─── IndexedDB 文件存取 ──────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB 不可用（SSR）'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function putFile(key: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    tx.objectStore(STORE_FILES).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getFile(key: string): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readonly');
    const req = tx.objectStore(STORE_FILES).get(key);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function deleteFile(key: string): Promise<void> {
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    tx.objectStore(STORE_FILES).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── 草单 CRUD ───────────────────────────────────────────────────

export function listDrafts(): LicenseDraft[] {
  return readJSON<LicenseDraft[]>(DRAFTS_KEY, []).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}

export function getDraft(id: string): LicenseDraft | undefined {
  return listDrafts().find((d) => d.id === id);
}

export interface SaveDraftInput {
  id?: string;
  no: string;
  title?: string;
  exporter: string;
  country: string;
  vehicleCount: number;
  totalAmount: number;
  status?: LicenseDraft['status'];
  contractNo?: string;
  vins?: string[];
  brand?: string;
  model?: string;
  main: unknown;
  annex: unknown;
}

export function saveDraft(input: SaveDraftInput): LicenseDraft {
  const drafts = readJSON<LicenseDraft[]>(DRAFTS_KEY, []);
  const now = Date.now();

  if (input.id) {
    const idx = drafts.findIndex((d) => d.id === input.id);
    if (idx >= 0) {
      const updated: LicenseDraft = {
        ...drafts[idx],
        no: input.no,
        title: input.title ?? drafts[idx].title,
        exporter: input.exporter,
        country: input.country,
        vehicleCount: input.vehicleCount,
        totalAmount: input.totalAmount,
        status: input.status ?? drafts[idx].status,
        contractNo: input.contractNo,
        vins: input.vins,
        brand: input.brand,
        model: input.model,
        updatedAt: now,
        main: input.main,
        annex: input.annex,
      };
      drafts[idx] = updated;
      writeJSON(DRAFTS_KEY, drafts);
      return updated;
    }
  }

  const created: LicenseDraft = {
    id: uid('draft_'),
    no: input.no,
    title: input.title || `草单 ${input.no || ''}`.trim(),
    exporter: input.exporter,
    country: input.country,
    vehicleCount: input.vehicleCount,
    totalAmount: input.totalAmount,
    status: input.status ?? 'draft',
    contractNo: input.contractNo,
    vins: input.vins,
    brand: input.brand,
    model: input.model,
    createdAt: now,
    updatedAt: now,
    main: input.main,
    annex: input.annex,
  };
  drafts.push(created);
  writeJSON(DRAFTS_KEY, drafts);
  return created;
}

export function deleteDraft(id: string): void {
  const drafts = readJSON<LicenseDraft[]>(DRAFTS_KEY, []);
  writeJSON(
    DRAFTS_KEY,
    drafts.filter((d) => d.id !== id),
  );
}

// ─── 已签发许可证 CRUD ───────────────────────────────────────────

/** 把发证日期（YYYY-MM-DD）转成可比较的时间戳；无法解析时返回 0 */
function parseIssueDate(ts?: string): number {
  if (!ts) return 0;
  const t = Date.parse(ts);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * 已签发许可证列表排序：
 * 1. 按发证日期（issueDate）从近到远，最近发出的排最前
 * 2. 未填写发证日期的记录沉到末尾，并按上传时间（createdAt）从近到远排序
 */
export function listIssued(): IssuedLicense[] {
  return readJSON<IssuedLicense[]>(ISSUED_KEY, []).sort((a, b) => {
    const da = parseIssueDate(a.issueDate);
    const db = parseIssueDate(b.issueDate);
    if (da !== db) return db - da;
    // 发证日期相同或都缺失时，按上传（创建）时间倒序兜底
    return b.createdAt - a.createdAt;
  });
}

/** 按任意一个 VIN 精确匹配；同时也支持按许可证号 / 出口商 / 文件名模糊匹配 */
export function searchIssued(query: string): IssuedLicense[] {
  const q = query.trim().toUpperCase();
  const all = listIssued();
  if (!q) return all;
  return all.filter((lic) => {
    if (lic.licenseNo.toUpperCase().includes(q)) return true;
    if (lic.exporter?.toUpperCase().includes(q)) return true;
    if (lic.fileName.toUpperCase().includes(q)) return true;
    if (lic.note?.toUpperCase().includes(q)) return true;
    // 关键：任何一个 VIN 匹配即可命中
    return lic.vins.some((v) => v.toUpperCase().includes(q));
  });
}

export interface SaveIssuedInput {
  id?: string;
  /** 新建时必填；编辑时若不传则保留原文件 */
  file?: File | Blob;
  fileName: string;
  fileMime?: string;
  licenseNo: string;
  vins: string[] | string;
  exporter?: string;
  issueDate?: string;
  note?: string;
}

export async function saveIssued(input: SaveIssuedInput): Promise<IssuedLicense> {
  const vins = parseVins(input.vins);
  if (vins.length === 0) {
    throw new Error('至少需要填写一个车架号（VIN）');
  }

  const existing = input.id
    ? listIssued().find((d) => d.id === input.id)
    : undefined;

  if (!existing && !input.file) {
    throw new Error('新建许可证必须上传文件');
  }

  const fileName = input.fileName || existing?.fileName || '';
  const mime =
    input.fileMime ||
    (input.file instanceof File
      ? input.file.type
      : existing?.fileMime) ||
    'application/octet-stream';
  const fileType = detectFileType(fileName, mime);
  const fileSize =
    input.file != null ? input.file.size : existing?.fileSize ?? 0;

  const now = Date.now();
  let record: IssuedLicense;

  if (existing) {
    record = {
      ...existing,
      licenseNo: input.licenseNo,
      fileName,
      fileType,
      fileMime: mime,
      fileSize,
      vins,
      exporter: input.exporter ?? existing.exporter,
      issueDate: input.issueDate ?? existing.issueDate,
      note: input.note ?? existing.note,
    };
  } else {
    record = {
      id: uid('lic_'),
      licenseNo: input.licenseNo,
      fileName,
      fileType,
      fileMime: mime,
      fileSize,
      vins,
      exporter: input.exporter,
      issueDate: input.issueDate,
      note: input.note,
      createdAt: now,
    };
  }
  record.__fileKey = record.id;

  // 仅在传入新文件时写入 IndexedDB，否则保留原文件
  if (input.file) {
    await putFile(record.id, input.file);
  }

  const list = readJSON<IssuedLicense[]>(ISSUED_KEY, []);
  const idx = list.findIndex((d) => d.id === record.id);
  // 持久化时不写 __fileKey 到 localStorage（运行时再补），避免冗余
  const { __fileKey, ...persisted } = record;
  void __fileKey;
  if (idx >= 0) list[idx] = persisted;
  else list.push(persisted);
  writeJSON(ISSUED_KEY, list);

  // 保存成功后记住本次使用的出口商，供下次上传自动填入
  if (record.exporter && record.exporter.trim()) {
    setLastExporter(record.exporter.trim());
  }

  return record;
}

/** 读取最近一次上传许可证时使用的出口商名称 */
export function getLastExporter(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(LAST_EXPORTER_KEY) ?? '';
  } catch {
    return '';
  }
}

/** 记录最近使用的出口商名称（在保存许可证或用户手动失焦时调用） */
export function setLastExporter(name: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    window.localStorage.setItem(LAST_EXPORTER_KEY, trimmed);
  } catch {
    // ignore quota errors
  }
}

export async function getIssuedFile(id: string): Promise<Blob | null> {
  return getFile(id);
}

export async function deleteIssued(id: string): Promise<void> {
  const list = readJSON<IssuedLicense[]>(ISSUED_KEY, []);
  writeJSON(
    ISSUED_KEY,
    list.filter((d) => d.id !== id),
  );
  try {
    await deleteFile(id);
  } catch (err) {
    // 文件清理失败不阻塞删除元数据
    console.warn('[license-storage] delete file failed:', err);
  }
}

// ─── 本地数据迁移到云端（一次性） ────────────────────────────────

/** 本地是否存在已签发许可证记录（用于迁移提示） */
export function hasLocalIssued(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(ISSUED_KEY);
    if (!raw) return false;
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) && arr.length > 0;
  } catch {
    return false;
  }
}

export function countLocalIssued(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(ISSUED_KEY);
    if (!raw) return 0;
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

/**
 * 读取本地所有已签发许可证元数据 + 对应文件 Blob，用于迁移上云。
 * 文件从 IndexedDB 读取；如果文件丢失则跳过该条记录。
 */
export async function readLocalIssuedForMigration(): Promise<
  Array<{ meta: IssuedLicense; file: Blob }>
> {
  const list = readJSON<IssuedLicense[]>(ISSUED_KEY, []);
  const result: Array<{ meta: IssuedLicense; file: Blob }> = [];
  for (const item of list) {
    try {
      const blob = await getFile(item.id);
      if (blob) result.push({ meta: item, file: blob });
    } catch (err) {
      console.warn('[license-storage] migration read file failed:', err);
    }
  }
  return result;
}

export interface MigrationProgress {
  total: number;
  succeeded: number;
  failed: number;
  currentName: string;
}

/**
 * 将本地已签发许可证逐条迁移到云端。
 *
 * @param upload - 实际上传函数（由页面注入，避免 storage.ts 直接依赖 API client）
 * @param onProgress - 每条处理完后的进度回调
 */
export async function migrateLocalIssued(
  upload: (params: {
    file: File;
    licenseNo: string;
    vins: string[];
    exporter?: string;
    issueDate?: string;
    note?: string;
  }) => Promise<unknown>,
  onProgress?: (p: MigrationProgress) => void,
): Promise<{ succeeded: number; failed: number; total: number }> {
  const items = await readLocalIssuedForMigration();
  let succeeded = 0;
  let failed = 0;

  for (const { meta, file } of items) {
    try {
      const fileExt = meta.fileName.includes('.')
        ? meta.fileName.slice(meta.fileName.lastIndexOf('.'))
        : '';
      const safeName =
        (meta.licenseNo || 'license').replace(/[^a-zA-Z0-9_-]/g, '_') + fileExt;
      const f = new File([file], safeName || meta.fileName, {
        type: meta.fileMime || 'application/octet-stream',
        lastModified: meta.createdAt,
      });
      await upload({
        file: f,
        licenseNo: meta.licenseNo,
        vins: meta.vins,
        exporter: meta.exporter,
        issueDate: meta.issueDate,
        note: meta.note,
      });
      succeeded += 1;
    } catch (err) {
      failed += 1;
      console.warn('[license-storage] migration upload failed:', err);
    } finally {
      onProgress?.({
        total: items.length,
        succeeded,
        failed,
        currentName: meta.fileName,
      });
    }
  }

  return { succeeded, failed, total: items.length };
}

/** 迁移成功后清空本地已签发记录（元数据 + IndexedDB 文件） */
export async function clearLocalIssued(): Promise<void> {
  const list = readJSON<IssuedLicense[]>(ISSUED_KEY, []);
  writeJSON(ISSUED_KEY, []);
  await Promise.all(
    list.map((item) =>
      deleteFile(item.id).catch((err) =>
        console.warn('[license-storage] cleanup file failed:', err),
      ),
    ),
  );
}

// ─── 出口商/发货人档案（可复用 + 备注） ───────────────────────────

/**
 * 一份"出口商/发货人"档案：保存主证第 1、2 栏需要的全部字段。
 * 备注字段方便用户在选择列表中识别，例如"主力抬头 / 香港抬头 / 测试"。
 *
 * @deprecated 使用领域模型 `Party`（@/lib/domain/party.ts）替代。
 * Party 通过 code/keyNo 字段承载出口商/发货人的电子钥匙与统一社会信用代码，
 * 不再需要独立的 LicensePartyProfile 类型。
 */
export interface LicensePartyProfile {
  id: string;
  name: string;          // 档案显示名（默认取出口商名称，可被用户覆盖）
  note: string;          // 备注（用户自填，用于快速查找）
  exporterName: string;
  exporterKeyNo: string;
  exporterCode: string;
  consignorName: string;
  consignorKeyNo: string;
  consignorCode: string;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
}

export function listPartyProfiles(): LicensePartyProfile[] {
  return readJSON<LicensePartyProfile[]>(PARTIES_KEY, []).sort(
    (a, b) => (b.lastUsedAt ?? b.updatedAt) - (a.lastUsedAt ?? a.updatedAt),
  );
}

export interface SavePartyInput {
  id?: string;
  name?: string;
  note?: string;
  exporterName: string;
  exporterKeyNo?: string;
  exporterCode?: string;
  consignorName: string;
  consignorKeyNo?: string;
  consignorCode?: string;
}

export function savePartyProfile(input: SavePartyInput): LicensePartyProfile {
  if (!input.exporterName.trim() && !input.consignorName.trim()) {
    throw new Error('出口商或发货人名称至少需要填写一项');
  }
  const list = readJSON<LicensePartyProfile[]>(PARTIES_KEY, []);
  const now = Date.now();

  if (input.id) {
    const idx = list.findIndex((p) => p.id === input.id);
    if (idx >= 0) {
      const old = list[idx]!;
      const updated: LicensePartyProfile = {
        ...old,
        name: (input.name ?? old.name).trim() || old.exporterName || '未命名档案',
        note: input.note ?? old.note,
        exporterName: input.exporterName,
        exporterKeyNo: input.exporterKeyNo ?? '',
        exporterCode: input.exporterCode ?? '',
        consignorName: input.consignorName,
        consignorKeyNo: input.consignorKeyNo ?? '',
        consignorCode: input.consignorCode ?? '',
        updatedAt: now,
      };
      list[idx] = updated;
      writeJSON(PARTIES_KEY, list);
      return updated;
    }
  }

  const record: LicensePartyProfile = {
    id: uid('party_'),
    name:
      (input.name ?? '').trim() ||
      input.exporterName.trim() ||
      input.consignorName.trim() ||
      '未命名档案',
    note: input.note ?? '',
    exporterName: input.exporterName,
    exporterKeyNo: input.exporterKeyNo ?? '',
    exporterCode: input.exporterCode ?? '',
    consignorName: input.consignorName,
    consignorKeyNo: input.consignorKeyNo ?? '',
    consignorCode: input.consignorCode ?? '',
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
  };
  list.push(record);
  writeJSON(PARTIES_KEY, list);
  return record;
}

export function touchPartyProfile(id: string): void {
  const list = readJSON<LicensePartyProfile[]>(PARTIES_KEY, []);
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx]!, lastUsedAt: Date.now() };
  writeJSON(PARTIES_KEY, list);
}

export function deletePartyProfile(id: string): void {
  const list = readJSON<LicensePartyProfile[]>(PARTIES_KEY, []);
  writeJSON(
    PARTIES_KEY,
    list.filter((p) => p.id !== id),
  );
}

// ─── 最近一次表单内容（下次新建草单自动带入） ─────────────────────

/**
 * 保存用户最近一次编辑/保存草单时的整张主证与附加信息表。
 * 下次进入"新建草单"时自动恢复，用户只需修改差异部分。
 * 注意：这是浏览器本地记忆，不跨设备同步。
 */
export function rememberLastForm(main: unknown, annex: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    if (main) window.localStorage.setItem(LAST_MAIN_KEY, JSON.stringify(main));
    if (annex) window.localStorage.setItem(LAST_ANNEX_KEY, JSON.stringify(annex));
  } catch (err) {
    console.warn('[license-storage] rememberLastForm failed:', err);
  }
}

export function recallLastMain<T>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_MAIN_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function recallLastAnnex<T>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LAST_ANNEX_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** 浏览器内直接触发下载 */
export async function downloadIssued(lic: IssuedLicense): Promise<void> {
  const blob = await getFile(lic.__fileKey ?? lic.id);
  if (!blob) throw new Error('文件已丢失，请重新上传');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = lic.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── 通用片段档案（商品信息 / 车主信息） ─────────────────────────

/**
 * 通用可复用片段：将一组字段（如商品名称+HS编码+设备状态、车主中英文名称+地址）
 * 存成命名档案，后续一键带入。
 */
export interface LicenseSnippet {
  id: string;
  name: string;       // 档案名称，用于列表识别
  note?: string;      // 备注
  data: Record<string, string>;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
}

function listSnippets(key: string): LicenseSnippet[] {
  return readJSON<LicenseSnippet[]>(key, []).sort(
    (a, b) => (b.lastUsedAt ?? b.updatedAt) - (a.lastUsedAt ?? a.updatedAt),
  );
}

function saveSnippet(
  key: string,
  input: { id?: string; name: string; note?: string; data: Record<string, string> },
): LicenseSnippet {
  const list = readJSON<LicenseSnippet[]>(key, []);
  const now = Date.now();
  if (input.id) {
    const idx = list.findIndex((p) => p.id === input.id);
    if (idx >= 0) {
      const old = list[idx]!;
      const updated: LicenseSnippet = {
        ...old,
        name: input.name.trim() || old.name,
        note: input.note ?? old.note ?? '',
        data: input.data,
        updatedAt: now,
      };
      list[idx] = updated;
      writeJSON(key, list);
      return updated;
    }
  }
  const record: LicenseSnippet = {
    id: uid('snp_'),
    name: input.name.trim() || '未命名片段',
    note: input.note ?? '',
    data: input.data,
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
  };
  list.push(record);
  writeJSON(key, list);
  return record;
}

function touchSnippet(key: string, id: string): void {
  const list = readJSON<LicenseSnippet[]>(key, []);
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx]!, lastUsedAt: Date.now() };
  writeJSON(key, list);
}

function deleteSnippet(key: string, id: string): void {
  const list = readJSON<LicenseSnippet[]>(key, []);
  writeJSON(key, list.filter((p) => p.id !== id));
}

// 商品信息（第 11 栏）
export const listGoodsProfiles = () => listSnippets(GOODS_KEY);
export const saveGoodsProfile = (input: {
  id?: string;
  name: string;
  note?: string;
  data: { descriptionOfGoods: string; codeOfGoods: string; equipmentStatus: string };
}) => saveSnippet(GOODS_KEY, input);
export const touchGoodsProfile = (id: string) => touchSnippet(GOODS_KEY, id);
export const deleteGoodsProfile = (id: string) => deleteSnippet(GOODS_KEY, id);

// 车主信息（附加信息表 Owner）
export const listOwnerProfiles = () => listSnippets(OWNERS_KEY);
export const saveOwnerProfile = (input: {
  id?: string;
  name: string;
  note?: string;
  data: {
    ownerNameCn: string;
    ownerNameEn: string;
    ownerAddressCn: string;
    ownerAddressEn: string;
  };
}) => saveSnippet(OWNERS_KEY, input);
export const touchOwnerProfile = (id: string) => touchSnippet(OWNERS_KEY, id);
export const deleteOwnerProfile = (id: string) => deleteSnippet(OWNERS_KEY, id);

// ─── 草单云端同步 ─────────────────────────────────────────────────

/** 本地是否存在草单记录（用于迁移提示） */
export function hasLocalDrafts(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(DRAFTS_KEY);
    if (!raw) return false;
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) && arr.length > 0;
  } catch {
    return false;
  }
}

/** 读取所有本地草单（仅元数据，不含文件） */
export function getLocalDrafts(): LicenseDraft[] {
  return listDrafts();
}

/** 批量标记本地草单已同步（写入 cloudId） */
export function markDraftsSynced(
  items: Array<{ localId: string; cloudId: string }>,
): void {
  const drafts = readJSON<LicenseDraft[]>(DRAFTS_KEY, []);
  for (const { localId, cloudId } of items) {
    const idx = drafts.findIndex((d) => d.id === localId);
    if (idx >= 0) {
      drafts[idx] = { ...drafts[idx]!, cloudId };
    }
  }
  writeJSON(DRAFTS_KEY, drafts);
}

/** 清空本地草单（迁移完成后调用） */
export function clearLocalDrafts(): void {
  writeJSON(DRAFTS_KEY, []);
}

/** 将云端草单格式转为本地格式（用于列表展示兼容） */
export function cloudToLocalDraft(
  cloud: {
    id: string;
    no: string;
    title: string;
    exporter: string;
    country: string;
    vehicleCount: number;
    totalAmount: number;
    status: 'draft' | 'submitted';
    contractNo?: string;
    vins?: string[];
    brand?: string;
    model?: string;
    main: unknown;
    annex: unknown;
    createdAt: number;
    updatedAt: number;
  },
): LicenseDraft {
  return {
    id: cloud.id,
    cloudId: cloud.id,
    no: cloud.no,
    title: cloud.title,
    exporter: cloud.exporter,
    country: cloud.country,
    vehicleCount: cloud.vehicleCount,
    totalAmount: cloud.totalAmount,
    status: cloud.status,
    contractNo: cloud.contractNo,
    vins: cloud.vins,
    brand: cloud.brand,
    model: cloud.model,
    main: cloud.main,
    annex: cloud.annex,
    createdAt: cloud.createdAt,
    updatedAt: cloud.updatedAt,
  };
}
