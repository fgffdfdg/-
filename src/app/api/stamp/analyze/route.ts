import { NextRequest, NextResponse } from "next/server";
import { HeaderUtils } from "coze-coding-dev-sdk";
import type {
  StampConfig,
  StampShape,
  BorderStyle,
  StampColor,
  CenterPatternType,
} from "@/lib/stamp/types";
import { callLLM } from "@/lib/llm-client";

interface AnalyzeRequest {
  imageData: string; // base64 data URL
}

// AI 返回的原始识别结果
interface AIStampAnalysis {
  shape: string;
  color: string;
  borderStyle: string;
  distressed: boolean;
  zoneA: { text: string } | null;
  zoneB: { text: string } | null;
  zoneC: { text: string; position: string } | null;
  zoneD: { type: string; centerText?: string } | null;
  zoneE: { text: string; layout: string } | null;
  zoneF: { text: string } | null;
}

const STAMP_ANALYZE_PROMPT = `你是一个印章内容识别工具。请观察这张印章图片，识别以下内容并严格返回 JSON。

识别项目：
1. shape：形状。circle（正圆）、ellipse（椭圆）、square（方形）、rectangle（矩形）
2. color：主色。red（红色）、blue（蓝色）
3. borderStyle：边框样式。single（单线）、double（双线）、none（无）
4. distressed：是否有做旧斑驳效果。true 或 false
5. zoneA：外圈环绕文字（沿印章边缘环绕排列的文字，通常绕满整圈底部留缺口，不是半圆）。如果没有则返回 null。如果有，返回 { "text": "文字内容" }
6. zoneB：内圈环绕文字（在外圈文字内侧，半径更小的环绕文字，通常是英文名）。如果没有则返回 null。如果有，返回 { "text": "文字内容" }
7. zoneC：横排文字（水平排列的文字，如"合同专用章""发票专用章"等）。如果没有则返回 null。如果有，返回 { "text": "文字内容", "position": "top/center/bottom" }，position 表示文字在印章中的垂直位置
8. zoneD：中心图案。star（五角星）、emblem（国徽）、text（文字）、none（无）。如果是文字类型，额外返回 centerText 字段
9. zoneE：主体文字（方形名章中的人名，通常竖排大字）。如果没有则返回 null。如果有，返回 { "text": "人名", "layout": "vertical/horizontal" }
10. zoneF：底部小字（税号、编号等小字信息）。如果没有则返回 null。如果有，返回 { "text": "内容" }

常见印章模式参考：
- 公章：circle + 外圈公司名 + 中心五角星
- 合同/财务/报关专用章：circle + 外圈公司名 + 横排标题(top) + 中心五角星
- 发票专用章：ellipse + 外圈公司名 + 横排"发票专用章"(center) + 底部税号
- 法人名章：square + 只有人名(vertical)，无其他元素
- 中英文章：circle + 外圈中文名 + 内圈英文名

注意：
- 只返回 JSON，不要任何解释或 markdown 标记
- 文字内容要准确识别，不要遗漏或编造
- 如果某个区域没有内容，返回 null
- 不要猜测任何数值参数（字号、间距等）

返回格式示例：
{
  "shape": "circle",
  "color": "red",
  "borderStyle": "single",
  "distressed": false,
  "zoneA": { "text": "XX国际贸易有限公司" },
  "zoneB": null,
  "zoneC": { "text": "合同专用章", "position": "top" },
  "zoneD": { "type": "star" },
  "zoneE": null,
  "zoneF": null
}`;

// ===== 验证和规范化函数 =====

function normalizeShape(val: string): StampShape {
  const valid: StampShape[] = ['circle', 'ellipse', 'square', 'rectangle'];
  return valid.includes(val as StampShape) ? (val as StampShape) : 'circle';
}

function normalizeColor(val: string): StampColor {
  return val === 'blue' ? 'blue' : 'red';
}

function normalizeBorderStyle(val: string): BorderStyle {
  const valid: BorderStyle[] = ['single', 'double', 'none'];
  return valid.includes(val as BorderStyle) ? (val as BorderStyle) : 'single';
}

function normalizeCenterType(val: string): CenterPatternType {
  const valid: CenterPatternType[] = ['star', 'emblem', 'text'];
  return valid.includes(val as CenterPatternType) ? (val as CenterPatternType) : 'star';
}

function normalizePosition(val: string): 'top' | 'center' | 'bottom' {
  const valid = ['top', 'center', 'bottom'];
  return valid.includes(val) ? (val as 'top' | 'center' | 'bottom') : 'center';
}

function normalizeLayout(val: string): 'vertical' | 'horizontal' {
  return val === 'horizontal' ? 'horizontal' : 'vertical';
}

function getDefaultSizeForShape(shape: StampShape): { w: number; h: number } {
  switch (shape) {
    case 'circle': return { w: 42, h: 42 };
    case 'ellipse': return { w: 40, h: 30 };
    case 'square': return { w: 20, h: 20 };
    case 'rectangle': return { w: 30, h: 15 };
  }
}

// ===== 将 AI 识别结果转换为完整的 StampConfig =====

function buildConfigFromAnalysis(analysis: AIStampAnalysis): StampConfig {
  const shape = normalizeShape(analysis.shape);
  const size = getDefaultSizeForShape(shape);

  const config: StampConfig = {
    shape,
    widthMm: size.w,
    heightMm: size.h,
    borderStyle: normalizeBorderStyle(analysis.borderStyle),
    borderWidth: 3,
    color: normalizeColor(analysis.color),
    distressed: analysis.distressed ?? false,
    opacity: 1,
    zoneA: null,
    zoneB: null,
    zoneC: null,
    zoneD: null,
    zoneE: null,
    zoneF: null,
  };

  if (analysis.zoneA?.text) {
    config.zoneA = {
      text: analysis.zoneA.text,
      fontFamily: 'simsun',
      fontSizePx: shape === 'ellipse' ? 12 : 14,
      letterSpacingPx: shape === 'ellipse' ? 1 : 2,
    };
  }

  if (analysis.zoneB?.text) {
    config.zoneB = {
      text: analysis.zoneB.text,
      fontFamily: 'arial',
      fontSizePx: 8,
      letterSpacingPx: 1,
    };
  }

  if (analysis.zoneC?.text) {
    config.zoneC = {
      text: analysis.zoneC.text,
      position: normalizePosition(analysis.zoneC.position),
      fontFamily: 'simsun',
      fontSizePx: 12,
    };
  }

  if (analysis.zoneD && analysis.zoneD.type !== 'none') {
    config.zoneD = {
      type: normalizeCenterType(analysis.zoneD.type),
      text: analysis.zoneD.centerText || undefined,
      size: 'medium',
    };
  }

  if (analysis.zoneE?.text) {
    config.zoneE = {
      text: analysis.zoneE.text,
      layout: normalizeLayout(analysis.zoneE.layout),
      fontFamily: 'kaiti',
      fontSizePx: 28,
    };
  }

  if (analysis.zoneF?.text) {
    config.zoneF = {
      text: analysis.zoneF.text,
      position: 'bottom',
      fontFamily: 'arial',
      fontSizePx: 8,
    };
  }

  return config;
}

// ===== 从 AI 响应中提取 JSON =====

function extractJsonFromResponse(content: string): AIStampAnalysis {
  let jsonStr = content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }
  return JSON.parse(jsonStr) as AIStampAnalysis;
}

// ===== 主处理逻辑 =====

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json() as AnalyzeRequest;

    if (!imageData) {
      return NextResponse.json(
        { error: "缺少图片数据" },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 调用统一 LLM 客户端（自动根据环境变量选择内置 SDK 或 Ark API）
    const content = await callLLM(
      [
        {
          role: "user",
          content: [
            { type: "text", text: STAMP_ANALYZE_PROMPT },
            { type: "image_url", image_url: { url: imageData } },
          ],
        },
      ],
      {
        model: "doubao-seed-2-0-lite-260215",
        temperature: 0.2,
      },
      customHeaders
    );

    const analysis = extractJsonFromResponse(content);
    const stampConfig = buildConfigFromAnalysis(analysis);

    return NextResponse.json({
      success: true,
      config: stampConfig,
      rawAnalysis: analysis,
    });
  } catch (error) {
    console.error("[Stamp Analyze] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `分析失败：${errorMessage}` },
      { status: 500 }
    );
  }
}
