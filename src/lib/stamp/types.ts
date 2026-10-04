// src/lib/stamp/types.ts

// ========== 基础类型 ==========

// 印章形状
export type StampShape = 'circle' | 'ellipse' | 'square' | 'rectangle';

// 印章创建类型
export type StampType = 'photo' | 'manual' | 'reference';

// 边框样式
export type BorderStyle = 'single' | 'double' | 'none';

// 印章主色
export type StampColor = 'red' | 'blue';

// 字体选项
export type StampFont = 'simsun' | 'simhei' | 'kaiti' | 'fangsong' | 'arial';

// ========== 选项常量 ==========

export const FONT_OPTIONS: { value: StampFont; label: string }[] = [
  { value: 'simsun', label: '宋体' },
  { value: 'simhei', label: '黑体' },
  { value: 'kaiti', label: '楷体' },
  { value: 'fangsong', label: '仿宋' },
  { value: 'arial', label: 'Arial' },
];

export const SHAPE_OPTIONS: { value: StampShape; label: string }[] = [
  { value: 'circle', label: '正圆' },
  { value: 'ellipse', label: '椭圆' },
  { value: 'square', label: '方形' },
  { value: 'rectangle', label: '矩形' },
];

export const BORDER_STYLE_OPTIONS: { value: BorderStyle; label: string }[] = [
  { value: 'single', label: '单线' },
  { value: 'double', label: '双线' },
  { value: 'none', label: '无' },
];

export const COLOR_OPTIONS: { value: StampColor; hex: string; label: string }[] = [
  { value: 'red', hex: '#CC0000', label: '红色' },
  { value: 'blue', hex: '#003399', label: '蓝色' },
];

// 获取颜色 hex 值
export function getColorHex(color: StampColor): string {
  return COLOR_OPTIONS.find(c => c.value === color)?.hex ?? '#CC0000';
}

// ========== 区域类型定义 ==========

// Zone A / B - 环绕文字区域（沿圆形边缘环绕排列，底部留缺口，不是半圆）
export interface ArcTextZone {
  text: string;
  fontFamily: StampFont;
  fontSizePx: number;
  letterSpacingPx: number;
}

// Zone C / F - 横排文字区域
export interface LineTextZone {
  text: string;
  position: 'top' | 'center' | 'bottom';
  fontFamily: StampFont;
  fontSizePx: number;
}

// Zone D - 中心图案区域
export type CenterPatternType = 'star' | 'emblem' | 'text';

export interface CenterZone {
  type: CenterPatternType;
  text?: string; // type 为 'text' 时使用
  size: 'small' | 'medium' | 'large';
}

// Zone E - 主体文字区域（名章专用）
export interface MainTextZone {
  text: string;
  layout: 'vertical' | 'horizontal';
  fontFamily: StampFont;
  fontSizePx: number;
}

// ========== 中心图案选项 ==========

export const CENTER_PATTERN_OPTIONS: { value: CenterPatternType; label: string }[] = [
  { value: 'star', label: '五角星' },
  { value: 'emblem', label: '国徽' },
  { value: 'text', label: '文字' },
];

export const CENTER_SIZE_OPTIONS: { value: 'small' | 'medium' | 'large'; label: string }[] = [
  { value: 'small', label: '小' },
  { value: 'medium', label: '中' },
  { value: 'large', label: '大' },
];

// ========== 横排文字位置选项 ==========

export const LINE_TEXT_POSITION_OPTIONS: { value: 'top' | 'center' | 'bottom'; label: string }[] = [
  { value: 'top', label: '上部' },
  { value: 'center', label: '中部' },
  { value: 'bottom', label: '下部' },
];

// ========== 主体文字排列选项 ==========

export const MAIN_TEXT_LAYOUT_OPTIONS: { value: 'vertical' | 'horizontal'; label: string }[] = [
  { value: 'vertical', label: '竖排' },
  { value: 'horizontal', label: '横排' },
];

// ========== 颜色选项别名 ==========

export const STAMP_COLOR_OPTIONS = COLOR_OPTIONS;

// ========== 默认印章配置 ==========

export const DEFAULT_STAMP_CONFIG: StampConfig = {
  shape: 'circle',
  widthMm: 42,
  heightMm: 42,
  borderStyle: 'single',
  borderWidth: 3,
  color: 'red',
  distressed: false,
  opacity: 1,
  zoneA: { text: '', fontFamily: 'simsun', fontSizePx: 14, letterSpacingPx: 2 },
  zoneB: null,
  zoneC: null,
  zoneD: { type: 'star', size: 'medium' },
  zoneE: null,
  zoneF: null,
};

// ========== 印章配置（核心数据结构） ==========

export interface StampConfig {
  // 全局属性
  shape: StampShape;
  widthMm: number;
  heightMm: number;
  borderStyle: BorderStyle;
  borderWidth: number;
  color: StampColor;
  distressed: boolean;
  opacity: number;

  // 内容区域（6 种，每种可选）
  zoneA: ArcTextZone | null;   // 外圈环绕文字（公司全称等，绕大圈）
  zoneB: ArcTextZone | null;   // 内圈环绕文字（英文名等，绕小圈）
  zoneC: LineTextZone | null;  // 横排文字（专用章名称等）
  zoneD: CenterZone | null;    // 中心图案（五角星/国徽等）
  zoneE: MainTextZone | null;  // 主体文字（名章专用）
  zoneF: LineTextZone | null;  // 底部信息（税号/编号等）
}

// ========== 旧类型兼容（用于迁移已有数据） ==========

/** @deprecated 旧版手动设计配置，仅用于数据迁移 */
export interface LegacyManualStampConfig {
  shape: string;
  width: number;
  height: number;
  borderWidth: number;
  borderColor: string;
  fontFamily: StampFont;
  outerText: {
    text: string;
    fontFamily: StampFont;
    fontSizePx: number;
    arcRadiusPx: number;
    letterSpacingPx: number;
    startAngle: number;
    color: string;
  };
  innerText?: {
    text: string;
    fontFamily: StampFont;
    fontSizePx: number;
    arcRadiusPx: number;
    letterSpacingPx: number;
    startAngle: number;
    color: string;
  };
  bottomText?: {
    text: string;
    fontFamily: StampFont;
    fontSizePx: number;
    position: 'top' | 'center' | 'bottom';
    offsetY?: number;
    color: string;
  };
  titleText?: {
    text: string;
    fontFamily: StampFont;
    fontSizePx: number;
    position: 'top' | 'center' | 'bottom';
    color: string;
  };
  center: {
    type: string;
    text?: string;
    color?: string;
  };
  color: string;
  distressed: boolean;
  opacity: number;
}

// ========== 其他类型 ==========

// 照片章配置
export interface PhotoStampConfig {
  imageData: string;
  processedImageData?: string;
}

// 参照制作印章配置
export interface ReferenceStampConfig {
  referenceImage: string;
  config: StampConfig;
}

// 已保存印章
export interface SavedStamp {
  id: string;
  name: string;
  type: StampType;
  imageData: string;
  config?: StampConfig | PhotoStampConfig | ReferenceStampConfig;
  createdAt: number;
}

// 标准尺寸
export interface StampSize {
  label: string;
  widthMm: number;
  heightMm: number;
  shapes: StampShape[]; // 适用形状
}

export const STANDARD_SIZES: StampSize[] = [
  { label: '圆形 40mm', widthMm: 40, heightMm: 40, shapes: ['circle'] },
  { label: '圆形 42mm', widthMm: 42, heightMm: 42, shapes: ['circle'] },
  { label: '圆形 45mm', widthMm: 45, heightMm: 45, shapes: ['circle'] },
  { label: '椭圆 40×30mm', widthMm: 40, heightMm: 30, shapes: ['ellipse'] },
  { label: '方形 20mm', widthMm: 20, heightMm: 20, shapes: ['square'] },
  { label: '方形 25mm', widthMm: 25, heightMm: 25, shapes: ['square'] },
];

// ========== 工具函数 ==========

// 判断是否为圆形类（圆/椭圆），决定显示哪些区域
export function isRoundShape(shape: StampShape): boolean {
  return shape === 'circle' || shape === 'ellipse';
}

// 判断是否为方形类（方/矩形），决定显示哪些区域
export function isSquareShape(shape: StampShape): boolean {
  return shape === 'square' || shape === 'rectangle';
}

// 获取形状对应的默认尺寸
export function getDefaultSize(shape: StampShape): { widthMm: number; heightMm: number } {
  switch (shape) {
    case 'circle': return { widthMm: 42, heightMm: 42 };
    case 'ellipse': return { widthMm: 40, heightMm: 30 };
    case 'square': return { widthMm: 20, heightMm: 20 };
    case 'rectangle': return { widthMm: 30, heightMm: 15 };
  }
}

// 创建空的印章配置
export function createEmptyConfig(shape: StampShape = 'circle'): StampConfig {
  const size = getDefaultSize(shape);
  return {
    shape,
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    borderStyle: 'single',
    borderWidth: 3,
    color: 'red',
    distressed: false,
    opacity: 1,
    zoneA: null,
    zoneB: null,
    zoneC: null,
    zoneD: null,
    zoneE: null,
    zoneF: null,
  };
}
