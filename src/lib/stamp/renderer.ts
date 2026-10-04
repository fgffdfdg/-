// src/lib/stamp/renderer.ts
// 印章渲染引擎 - 基于区域组合模型

import type {
  StampConfig,
  ArcTextZone,
  LineTextZone,
  CenterZone,
  MainTextZone,
} from './types';
import { getColorHex, isRoundShape } from './types';

const MM_TO_PX = 3.78;
const CANVAS_SIZE = 400;

export function drawManualStamp(
  ctx: CanvasRenderingContext2D,
  config: StampConfig,
) {

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const cx = CANVAS_SIZE / 2;
  const cy = CANVAS_SIZE / 2;
  const rx = (config.widthMm * MM_TO_PX) / 2;
  const ry = (config.heightMm * MM_TO_PX) / 2;
  const hex = getColorHex(config.color);

  ctx.save();
  ctx.globalAlpha = config.opacity;

  // 1. 画边框
  drawBorder(ctx, config, cx, cy, rx, ry, hex);

  // 2. 根据形状类型绘制不同区域
  if (isRoundShape(config.shape)) {
    // 圆形/椭圆：绘制 Zone A~D、F
    if (config.zoneA) {
      drawArcText(ctx, config.zoneA, cx, cy, rx, ry, config.borderWidth, hex, 1.0);
    }
    if (config.zoneB) {
      drawArcText(ctx, config.zoneB, cx, cy, rx, ry, config.borderWidth, hex, 0.78);
    }
    if (config.zoneC) {
      drawLineTextInRound(ctx, config.zoneC, cx, cy, rx, ry, hex);
    }
    if (config.zoneD) {
      drawCenterPattern(ctx, config.zoneD, cx, cy, rx, ry, hex);
    }
    if (config.zoneF) {
      drawLineTextInRound(ctx, config.zoneF, cx, cy, rx, ry, hex);
    }
  } else {
    // 方形/矩形：绘制 Zone E
    if (config.zoneE) {
      drawMainText(ctx, config.zoneE, cx, cy, hex);
    }
  }

  // 3. 做旧效果
  if (config.distressed) {
    applyDistressedEffect(ctx, CANVAS_SIZE);
  }

  ctx.restore();
}

// ========== 边框绘制 ==========

function drawBorder(
  ctx: CanvasRenderingContext2D,
  config: StampConfig,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  hex: string,
) {
  if (config.borderStyle === 'none') return;

  ctx.strokeStyle = hex;
  ctx.lineWidth = config.borderWidth;

  const drawShape = (offsetX: number, offsetY: number, rxx: number, ryy: number) => {
    if (config.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(rxx, ryy), 0, Math.PI * 2);
      ctx.stroke();
    } else if (config.shape === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rxx, ryy, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (config.shape === 'square') {
      const s = Math.min(rxx, ryy);
      ctx.strokeRect(cx - s + offsetX, cy - s + offsetY, (s - offsetX) * 2, (s - offsetY) * 2);
    } else {
      // rectangle
      const hw = rxx + offsetX;
      const hh = ryy + offsetY;
      ctx.strokeRect(cx - hw, cy - hh, hw * 2, hh * 2);
    }
  };

  if (config.borderStyle === 'single') {
    drawShape(0, 0, rx, ry);
  } else if (config.borderStyle === 'double') {
    // 外圈
    drawShape(0, 0, rx, ry);
    // 内圈（间距 4px）
    const gap = 4;
    const innerRx = rx - config.borderWidth - gap;
    const innerRy = ry - config.borderWidth - gap;
    if (innerRx > 0 && innerRy > 0) {
      ctx.lineWidth = config.borderWidth * 0.6;
      drawShape(0, 0, innerRx, innerRy);
    }
  }
}

// ========== 环绕文字（Zone A / B） ==========
// 文字沿圆形边缘环绕排列，绕满整圈底部留缺口（不是半圆）
// radiusRatio: 外圈用 1.0，内圈用更小的值（如 0.75）

function drawArcText(
  ctx: CanvasRenderingContext2D,
  zone: ArcTextZone,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  borderWidth: number,
  hex: string,
  radiusRatio: number, // 1.0 = 外圈, <1.0 = 内圈
) {
  const baseRadius = Math.min(rx, ry) - borderWidth - zone.fontSizePx * 0.5 - 3;
  const radius = baseRadius * radiusRatio;
  if (radius <= 0 || !zone.text) return;

  ctx.save();
  ctx.fillStyle = hex;
  ctx.font = `${zone.fontSizePx}px ${zone.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const chars = zone.text.split('');
  // 每个字符的间距角度（弧度）
  const spacingAngle = (zone.letterSpacingPx * 0.018) + 0.045;
  // 总跨度 = (字符数-1) * 间距
  const totalAngle = (chars.length - 1) * spacingAngle;
  // 限制最大展开角度为 300°（底部留约 60° 缺口）
  const maxSpan = Math.PI * (5 / 3); // ~300°
  const clampedTotal = Math.min(totalAngle, maxSpan);
  const step = chars.length > 1 ? clampedTotal / (chars.length - 1) : 0;

  // 起始角度：左侧约 7 点钟方向（210°），文字顺时针绕到右侧约 5 点钟方向（330°）
  // Canvas 坐标系：0°=右, π/2=下, π=左, 3π/2=上
  // 210° = 7π/6, 330° = 11π/6
  const startAngle = (7 * Math.PI) / 6;

  chars.forEach((char, i) => {
    const angle = startAngle + i * step;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    ctx.save();
    ctx.translate(x, y);
    // 文字朝向圆心外侧
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(char, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}

// ========== 横排文字（Zone C / F） ==========

function drawLineTextInRound(
  ctx: CanvasRenderingContext2D,
  zone: LineTextZone,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  hex: string,
) {
  if (!zone.text) return;

  ctx.save();
  ctx.fillStyle = hex;
  ctx.font = `${zone.fontSizePx}px ${zone.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let y: number;
  switch (zone.position) {
    case 'top':
      y = cy - ry * 0.25;
      break;
    case 'bottom':
      y = cy + ry * 0.55;
      break;
    case 'center':
    default:
      y = cy;
      break;
  }

  ctx.fillText(zone.text, cx, y);
  ctx.restore();
}

// ========== 中心图案（Zone D） ==========

function drawCenterPattern(
  ctx: CanvasRenderingContext2D,
  zone: CenterZone,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  hex: string,
) {
  const baseSize = Math.min(rx, ry) * 0.3;
  const sizeMultiplier = zone.size === 'small' ? 0.7 : zone.size === 'large' ? 1.3 : 1.0;
  const size = baseSize * sizeMultiplier;

  // 如果有横排文字在 center 位置，中心图案稍微下移
  const offsetY = 0;

  ctx.save();

  if (zone.type === 'star') {
    drawStar(ctx, cx, cy + offsetY, 5, size, size * 0.45, hex);
  } else if (zone.type === 'emblem') {
    // 简化国徽：用圆形+放射线表示
    drawEmblem(ctx, cx, cy + offsetY, size, hex);
  } else if (zone.type === 'text' && zone.text) {
    ctx.fillStyle = hex;
    ctx.font = `bold ${size * 0.8}px simhei`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(zone.text, cx, cy + offsetY);
  }

  ctx.restore();
}

// ========== 主体文字（Zone E，名章专用） ==========

function drawMainText(
  ctx: CanvasRenderingContext2D,
  zone: MainTextZone,
  cx: number,
  cy: number,
  hex: string,
) {
  ctx.save();
  ctx.fillStyle = hex;
  ctx.font = `bold ${zone.fontSizePx}px ${zone.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (zone.layout === 'vertical') {
    // 竖排：每个字一列
    const chars = zone.text.split('');
    const lineHeight = zone.fontSizePx * 1.2;
    const totalHeight = chars.length * lineHeight;
    const startY = cy - totalHeight / 2 + lineHeight / 2;
    chars.forEach((char, i) => {
      ctx.fillText(char, cx, startY + i * lineHeight);
    });
  } else {
    // 横排
    ctx.fillText(zone.text, cx, cy);
  }

  ctx.restore();
}

// ========== 辅助绘制函数 ==========

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
  color: string,
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  // 简化国徽：外圆 + 内部放射线 + 中心星
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;

  // 外圆
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.stroke();

  // 放射线
  const rays = 12;
  for (let i = 0; i < rays; i++) {
    const angle = (Math.PI * 2 * i) / rays;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * size * 0.5, cy + Math.sin(angle) * size * 0.5);
    ctx.lineTo(cx + Math.cos(angle) * size * 0.85, cy + Math.sin(angle) * size * 0.85);
    ctx.stroke();
  }

  // 中心小星
  drawStar(ctx, cx, cy, 5, size * 0.35, size * 0.15, color);
}

function applyDistressedEffect(ctx: CanvasRenderingContext2D, size: number) {
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  // 随机移除一些像素，模拟斑驳效果
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0 && Math.random() < 0.08) {
      data[i + 3] = 0; // 设为透明
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// ========== 导出工具 ==========

export function renderStampToDataUrl(config: StampConfig): string {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawManualStamp(ctx, config);
  return canvas.toDataURL('image/png');
}
