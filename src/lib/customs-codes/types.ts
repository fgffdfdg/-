/**
 * 海关基础代码表 - 通用类型
 *
 * 用于"出口报关单预录入"模块中所有编码下拉（境内货源地、关别、国别、港口、HS编码、币制等）。
 * 每个编码项都包含 code + name，可选 alias（拼音/简称）以支持模糊搜索。
 */
export interface CustomsCodeItem {
  /** 代码，如 "31222"、"CHN"、"8703801010" */
  code: string;
  /** 中文名称 */
  name: string;
  /** 可选：别名/拼音首字母，用于搜索 */
  alias?: string;
  /** 可选：分组，如 HS 编码的"章节"、货源地的"省份" */
  group?: string;
}

/** 格式化一个代码项为 "code - name" 显示文本 */
export function formatCodeItem(item: CustomsCodeItem | null | undefined): string {
  if (!item) return '';
  return `${item.code} - ${item.name}`;
}

/** 在代码列表中按 code 查找 */
export function findByCode<T extends CustomsCodeItem>(list: T[], code: string | null | undefined): T | undefined {
  if (!code) return undefined;
  return list.find((i) => i.code === code);
}

/**
 * 模糊过滤：支持代码前缀匹配 + 名称包含 + 拼音首字母包含。
 * 例如输入"bj"或"北京"都能匹配"11019 - 东城区"（假设 alias 包含 beijing）。
 */
export function filterCodes<T extends CustomsCodeItem>(list: T[], keyword: string, limit = 50): T[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return list.slice(0, limit);
  const matched: T[] = [];
  for (const item of list) {
    const code = item.code.toLowerCase();
    const name = item.name.toLowerCase();
    const alias = (item.alias || '').toLowerCase();
    if (code.startsWith(kw) || name.includes(kw) || alias.includes(kw) || alias.replace(/\s/g, '').includes(kw.replace(/\s/g, ''))) {
      matched.push(item);
      if (matched.length >= limit) break;
    }
  }
  return matched;
}
