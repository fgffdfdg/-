/**
 * 单证统一检索 - 检索引擎
 * 并行查询所有单证数据源，合并结果统一返回
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DocSearchResult, UnifiedDocType, DocStatus, DocSearchParams, DocSearchResponse } from './types';
import { DOC_TYPE_META, isVinQuery } from './types';

interface DbRow {
  id: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

// ─── 各数据源查询函数 ───

async function searchContractDocuments(
  client: SupabaseClient,
  q: string,
  isVin: boolean,
): Promise<DocSearchResult[]> {
  const results: DocSearchResult[] = [];
  const upperQ = q.toUpperCase();

  try {
    if (isVin) {
      // VIN 精确匹配
      const { data } = await client
        .from('contract_documents')
        .select('*')
        .contains('vins', [upperQ]);
      if (data) {
        for (const row of data as any[]) {
          const status: DocStatus = row.status === 'draft' ? 'draft' : 'official';
          results.push({
            id: row.id,
            docType: 'contract-invoice-pl',
            docTypeLabel: DOC_TYPE_META['contract-invoice-pl'].label,
            docNo: row.contract_no || row.invoice_no || row.packing_list_no || null,
            title: null,
            status,
            statusLabel: status === 'draft' ? '草稿' : '正式',
            relatedNos: {
              contractNo: row.contract_no || null,
              invoiceNo: row.invoice_no || null,
              packingListNo: row.packing_list_no || null,
              licenseNo: null,
              customsNo: null,
              blNo: null,
            },
            vins: row.vins || [],
            hasFile: !!row.file_key,
            fileName: row.file_name || null,
            fileMime: row.file_mime || null,
            source: 'contract_documents',
            sourceRoute: '/documents',
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          });
        }
      }
    } else {
      // 文本模糊匹配
      const likeQ = `%${q}%`;
      const { data } = await client
        .from('contract_documents')
        .select('*')
        .or(`contract_no.ilike.${likeQ},invoice_no.ilike.${likeQ},packing_list_no.ilike.${likeQ}`);
      if (data) {
        for (const row of data as any[]) {
          const status: DocStatus = row.status === 'draft' ? 'draft' : 'official';
          results.push({
            id: row.id,
            docType: 'contract-invoice-pl',
            docTypeLabel: DOC_TYPE_META['contract-invoice-pl'].label,
            docNo: row.contract_no || row.invoice_no || row.packing_list_no || null,
            title: null,
            status,
            statusLabel: status === 'draft' ? '草稿' : '正式',
            relatedNos: {
              contractNo: row.contract_no || null,
              invoiceNo: row.invoice_no || null,
              packingListNo: row.packing_list_no || null,
              licenseNo: null,
              customsNo: null,
              blNo: null,
            },
            vins: row.vins || [],
            hasFile: !!row.file_key,
            fileName: row.file_name || null,
            fileMime: row.file_mime || null,
            source: 'contract_documents',
            sourceRoute: '/documents',
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          });
        }
      }
    }
  } catch {
    // 表可能不存在，静默跳过
  }
  return results;
}

async function searchExportLicenses(
  client: SupabaseClient,
  q: string,
  isVin: boolean,
): Promise<DocSearchResult[]> {
  const results: DocSearchResult[] = [];
  const upperQ = q.toUpperCase();

  try {
    if (isVin) {
      const { data } = await client
        .from('export_licenses')
        .select('*')
        .contains('vins', [upperQ]);
      if (data) {
        for (const row of data as any[]) {
          results.push({
            id: row.id,
            docType: 'export-license',
            docTypeLabel: DOC_TYPE_META['export-license'].label,
            docNo: row.license_no || null,
            title: row.exporter || null,
            status: 'official',
            statusLabel: '正式',
            relatedNos: {
              contractNo: null,
              invoiceNo: null,
              packingListNo: null,
              licenseNo: row.license_no || null,
              customsNo: null,
              blNo: null,
            },
            vins: row.vins || [],
            hasFile: !!row.file_key,
            fileName: row.file_name || null,
            fileMime: row.file_mime || null,
            source: 'export_licenses',
            sourceRoute: '/export-license',
            createdAt: row.created_at || row.issue_date || '',
            updatedAt: row.updated_at || row.issue_date || '',
          });
        }
      }
    } else {
      const likeQ = `%${q}%`;
      const { data } = await client
        .from('export_licenses')
        .select('*')
        .or(`license_no.ilike.${likeQ},exporter.ilike.${likeQ}`);
      if (data) {
        for (const row of data as any[]) {
          results.push({
            id: row.id,
            docType: 'export-license',
            docTypeLabel: DOC_TYPE_META['export-license'].label,
            docNo: row.license_no || null,
            title: row.exporter || null,
            status: 'official',
            statusLabel: '正式',
            relatedNos: {
              contractNo: null,
              invoiceNo: null,
              packingListNo: null,
              licenseNo: row.license_no || null,
              customsNo: null,
              blNo: null,
            },
            vins: row.vins || [],
            hasFile: !!row.file_key,
            fileName: row.file_name || null,
            fileMime: row.file_mime || null,
            source: 'export_licenses',
            sourceRoute: '/export-license',
            createdAt: row.created_at || row.issue_date || '',
            updatedAt: row.updated_at || row.issue_date || '',
          });
        }
      }
    }
  } catch { /* skip */ }
  return results;
}

async function searchLicenseDrafts(
  client: SupabaseClient,
  q: string,
  isVin: boolean,
): Promise<DocSearchResult[]> {
  const results: DocSearchResult[] = [];
  const upperQ = q.toUpperCase();

  try {
    if (isVin) {
      const { data } = await client
        .from('license_drafts')
        .select('*')
        .contains('vins', [upperQ]);
      if (data) {
        for (const row of data as any[]) {
          results.push({
            id: row.id,
            docType: 'license-draft',
            docTypeLabel: DOC_TYPE_META['license-draft'].label,
            docNo: row.draft_no || null,
            title: row.exporter || null,
            status: 'draft',
            statusLabel: '草稿',
            relatedNos: {
              contractNo: row.contract_no || null,
              invoiceNo: null,
              packingListNo: null,
              licenseNo: row.draft_no || null,
              customsNo: null,
              blNo: null,
            },
            vins: row.vins || [],
            hasFile: false,
            fileName: null,
            fileMime: null,
            source: 'license_drafts',
            sourceRoute: `/export-license/draft?id=${row.id}`,
            createdAt: row.created_at || '',
            updatedAt: row.updated_at || '',
          });
        }
      }
    } else {
      const likeQ = `%${q}%`;
      const { data } = await client
        .from('license_drafts')
        .select('*')
        .or(`draft_no.ilike.${likeQ},contract_no.ilike.${likeQ},exporter.ilike.${likeQ}`);
      if (data) {
        for (const row of data as any[]) {
          results.push({
            id: row.id,
            docType: 'license-draft',
            docTypeLabel: DOC_TYPE_META['license-draft'].label,
            docNo: row.draft_no || null,
            title: row.exporter || null,
            status: 'draft',
            statusLabel: '草稿',
            relatedNos: {
              contractNo: row.contract_no || null,
              invoiceNo: null,
              packingListNo: null,
              licenseNo: row.draft_no || null,
              customsNo: null,
              blNo: null,
            },
            vins: row.vins || [],
            hasFile: false,
            fileName: null,
            fileMime: null,
            source: 'license_drafts',
            sourceRoute: `/export-license/draft?id=${row.id}`,
            createdAt: row.created_at || '',
            updatedAt: row.updated_at || '',
          });
        }
      }
    }
  } catch { /* skip */ }
  return results;
}

async function searchCustomsDeclarations(
  client: SupabaseClient,
  q: string,
  isVin: boolean,
): Promise<DocSearchResult[]> {
  const results: DocSearchResult[] = [];
  const upperQ = q.toUpperCase();

  try {
    const likeQ = `%${q}%`;
    // 查询正式报关单文件
    const { data: files } = await client
      .from('customs_declaration_files')
      .select('*')
      .or(`entry_no.ilike.${likeQ},customs_no.ilike.${likeQ},contract_no.ilike.${likeQ}`);

    if (files) {
      for (const row of files as any[]) {
        results.push({
          id: row.id,
          docType: 'customs-declaration',
          docTypeLabel: DOC_TYPE_META['customs-declaration'].label,
          docNo: row.entry_no || null,
          title: row.customs_no || null,
          status: 'official',
          statusLabel: '正式',
          relatedNos: {
            contractNo: row.contract_no || null,
            invoiceNo: null,
            packingListNo: null,
            licenseNo: null,
            customsNo: row.customs_no || row.entry_no || null,
            blNo: null,
          },
          vins: row.vins || [],
          hasFile: !!row.file_key,
          fileName: row.file_name || null,
          fileMime: row.file_mime || null,
          source: 'customs_declaration_files',
          sourceRoute: '/customs-declaration',
          createdAt: row.created_at || '',
          updatedAt: row.updated_at || '',
        });
      }
    }

    // VIN 查询正式报关单
    if (isVin) {
      const { data: vinFiles } = await client
        .from('customs_declaration_files')
        .select('*')
        .contains('vins', [upperQ]);
      if (vinFiles) {
        for (const row of vinFiles as any[]) {
          if (results.find((r) => r.id === row.id)) continue;
          results.push({
            id: row.id,
            docType: 'customs-declaration',
            docTypeLabel: DOC_TYPE_META['customs-declaration'].label,
            docNo: row.entry_no || null,
            title: row.customs_no || null,
            status: 'official',
            statusLabel: '正式',
            relatedNos: {
              contractNo: row.contract_no || null,
              invoiceNo: null,
              packingListNo: null,
              licenseNo: null,
              customsNo: row.customs_no || row.entry_no || null,
              blNo: null,
            },
            vins: row.vins || [],
            hasFile: !!row.file_key,
            fileName: row.file_name || null,
            fileMime: row.file_mime || null,
            source: 'customs_declaration_files',
            sourceRoute: '/customs-declaration',
            createdAt: row.created_at || '',
            updatedAt: row.updated_at || '',
          });
        }
      }
    }

    // 查询草稿报关单
    const { data: drafts } = await client
      .from('customs_declarations')
      .select('*')
      .or(`entry_no.ilike.${likeQ},customs_no.ilike.${likeQ},contract_no.ilike.${likeQ}`);

    if (drafts) {
      for (const row of drafts as any[]) {
        results.push({
          id: row.id,
          docType: 'customs-draft',
          docTypeLabel: DOC_TYPE_META['customs-draft'].label,
          docNo: row.entry_no || null,
          title: row.customs_no || null,
          status: 'draft',
          statusLabel: '草稿',
          relatedNos: {
            contractNo: row.contract_no || null,
            invoiceNo: null,
            packingListNo: null,
            licenseNo: null,
            customsNo: row.customs_no || row.entry_no || null,
            blNo: null,
          },
          vins: extractVinsFromData(row.data),
          hasFile: false,
          fileName: null,
          fileMime: null,
          source: 'customs_declarations',
          sourceRoute: '/customs-declaration',
          createdAt: row.created_at || '',
          updatedAt: row.updated_at || '',
        });
      }
    }
  } catch { /* skip */ }
  return results;
}

async function searchBlDocuments(
  client: SupabaseClient,
  q: string,
  isVin: boolean,
): Promise<DocSearchResult[]> {
  const results: DocSearchResult[] = [];
  const upperQ = q.toUpperCase();

  try {
    if (isVin) {
      const { data } = await client
        .from('bl_documents')
        .select('*')
        .contains('vins', [upperQ]);
      if (data) {
        for (const row of data as any[]) {
          results.push(makeBlResult(row));
        }
      }
      // 也查集装箱号
      const { data: containerData } = await client
        .from('bl_documents')
        .select('*')
        .contains('container_numbers', [upperQ]);
      if (containerData) {
        for (const row of containerData as any[]) {
          if (results.find((r) => r.id === row.id)) continue;
          results.push(makeBlResult(row));
        }
      }
    } else {
      const likeQ = `%${q}%`;
      const { data } = await client
        .from('bl_documents')
        .select('*')
        .or(`bl_no.ilike.${likeQ},vessel_name.ilike.${likeQ},voyage.ilike.${likeQ}`);
      if (data) {
        for (const row of data as any[]) {
          results.push(makeBlResult(row));
        }
      }
    }
  } catch { /* skip */ }
  return results;
}

function makeBlResult(row: any): DocSearchResult {
  return {
    id: row.id,
    docType: 'bl-document',
    docTypeLabel: DOC_TYPE_META['bl-document'].label,
    docNo: row.bl_no || null,
    title: `${row.vessel_name || ''} ${row.voyage || ''}`.trim() || null,
    status: 'official',
    statusLabel: '正式',
    relatedNos: {
      contractNo: null,
      invoiceNo: null,
      packingListNo: null,
      licenseNo: null,
      customsNo: null,
      blNo: row.bl_no || null,
    },
    vins: row.vins || [],
    hasFile: !!row.file_key,
    fileName: row.file_name || null,
    fileMime: row.file_mime || null,
    source: 'bl_documents',
    sourceRoute: '/shipping/bl-documents',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}


// ─── 报关单正式文件 ───

async function searchCustomsDeclarationFiles(
  client: SupabaseClient,
  q: string,
  isVin: boolean,
): Promise<DocSearchResult[]> {
  const results: DocSearchResult[] = [];
  const upperQ = q.toUpperCase();

  try {
    if (isVin) {
      const { data } = await client
        .from('customs_declaration_files')
        .select('*')
        .contains('vins', [upperQ]);
      if (data) {
        for (const row of data as any[]) {
          results.push(makeCustomsFileResult(row));
        }
      }
    } else {
      const likeQ = `%${q}%`;
      const { data } = await client
        .from('customs_declaration_files')
        .select('*')
        .or(`entry_no.ilike.${likeQ},customs_no.ilike.${likeQ},contract_no.ilike.${likeQ}`);
      if (data) {
        for (const row of data as any[]) {
          results.push(makeCustomsFileResult(row));
        }
      }
    }
  } catch { /* skip */ }
  return results;
}

function makeCustomsFileResult(row: any): DocSearchResult {
  return {
    id: row.id,
    docType: 'customs-declaration',
    docTypeLabel: DOC_TYPE_META['customs-declaration'].label,
    docNo: row.entry_no || row.customs_no || null,
    title: null,
    status: 'official',
    statusLabel: '正式',
    relatedNos: {
      contractNo: row.contract_no || null,
      invoiceNo: null,
      packingListNo: null,
      licenseNo: null,
      customsNo: row.customs_no || null,
      blNo: null,
    },
    vins: row.vins || [],
    hasFile: !!row.file_key,
    fileName: row.file_name || null,
    fileMime: row.file_mime || null,
    source: 'customs_declaration_files',
    sourceRoute: '/customs-declaration/upload',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}


// ─── 工具函数 ───

function extractVinsFromData(data: unknown): string[] {
  if (!data) return [];
  try {
    const obj = typeof data === 'string' ? JSON.parse(data) : data;
    if (Array.isArray(obj)) {
      return obj
        .map((item: any) => item?.vin || item?.chassis || item?.frameNo || '')
        .filter(Boolean);
    }
    if (typeof obj === 'object' && obj !== null) {
      const vins: string[] = [];
      const extract = (o: any) => {
        if (!o || typeof o !== 'object') return;
        for (const key of Object.keys(o)) {
          if (key.toLowerCase().includes('vin') && typeof o[key] === 'string') {
            vins.push(o[key].toUpperCase());
          } else if (typeof o[key] === 'object') {
            extract(o[key]);
          }
        }
      };
      extract(obj);
      return [...new Set(vins)];
    }
  } catch { /* ignore */ }
  return [];
}

// ─── 主搜索函数 ───

export async function searchDocuments(
  client: SupabaseClient,
  params: DocSearchParams,
): Promise<DocSearchResponse> {
  const { q, type, status, page = 1, pageSize = 20 } = params;
  const trimmed = q.trim();
  if (!trimmed) {
    return { data: [], total: 0, page: 1, pageSize, summary: { totalCount: 0, officialCount: 0, draftCount: 0, byType: {} } };
  }

  const isVin = isVinQuery(trimmed);

  // 并行查询所有数据源
  const promises: Promise<DocSearchResult[]>[] = [];

  if (!type || type === 'contract-invoice-pl' || type === 'all') {
    promises.push(searchContractDocuments(client, trimmed, isVin));
  }
  if (!type || type === 'export-license' || type === 'license-draft' || type === 'all') {
    promises.push(searchExportLicenses(client, trimmed, isVin));
    promises.push(searchLicenseDrafts(client, trimmed, isVin));
  }
  if (!type || type === 'customs-declaration' || type === 'customs-draft' || type === 'all') {
    promises.push(searchCustomsDeclarations(client, trimmed, isVin));
    promises.push(searchCustomsDeclarationFiles(client, trimmed, isVin));
  }
  if (!type || type === 'bl-document' || type === 'all') {
    promises.push(searchBlDocuments(client, trimmed, isVin));
  }

  const allResults = (await Promise.all(promises)).flat();

  // 排序：精确匹配优先
  const exactMatch = (r: DocSearchResult) => {
    const no = r.docNo?.toUpperCase() || '';
    const relatedNos = Object.values(r.relatedNos).filter(Boolean) as string[];
    return no === trimmed.toUpperCase() || relatedNos.some((n) => n.toUpperCase() === trimmed.toUpperCase());
  };

  const vinMatch = (r: DocSearchResult) => {
    return r.vins.some((v) => v.toUpperCase() === trimmed.toUpperCase());
  };

  allResults.sort((a, b) => {
    const aExact = exactMatch(a) ? 0 : 1;
    const bExact = exactMatch(b) ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    const aVin = vinMatch(a) ? 0 : 1;
    const bVin = vinMatch(b) ? 0 : 1;
    if (aVin !== bVin) return aVin - bVin;
    return (b.updatedAt || '').localeCompare(a.updatedAt || '');
  });

  // 状态筛选
  let filtered = allResults;
  if (status && status !== 'all') {
    filtered = allResults.filter((r) => r.status === status);
  }

  // 分页
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  // 统计
  const byType: Partial<Record<UnifiedDocType, number>> = {};
  let officialCount = 0;
  let draftCount = 0;
  for (const r of filtered) {
    byType[r.docType] = (byType[r.docType] || 0) + 1;
    if (r.status === 'official') officialCount++;
    else draftCount++;
  }

  return {
    data: paged,
    total,
    page,
    pageSize,
    summary: {
      totalCount: total,
      officialCount,
      draftCount,
      byType,
    },
  };
}