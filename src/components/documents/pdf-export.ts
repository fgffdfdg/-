// 单证 PDF 导出工具
// 核心修复：预览区外层有 transform: scale(zoom)，会导致 html2canvas 1.4.1
// 截图错位/空白。这里通过 onclone 回调在克隆文档上移除所有 transform，
// 同时移除 fixed/sticky 定位避免裁剪。另限制最大像素，控制内存避免卡顿。

export type PdfOrientation = 'portrait' | 'landscape';

export interface PdfExportOptions {
  orientation?: PdfOrientation;
}

export interface PdfSection {
  elementId: string;
  orientation?: PdfOrientation;
}

// 安全的 scale：A4 210mm 约 794px(@96dpi)，scale=2 即 1588px 宽，足够清晰
// 对横向报关单（297mm）scale=2 约 2245px，也在可接受范围
const SCALE = 2;

// html2canvas 在克隆文档中需要清除的样式属性（沿祖先链处理）
const TRANSFORM_PROPS = [
  'transform',
  'webkitTransform',
  'mozTransform',
  'msTransform',
  'oTransform',
] as const;

function stripTransforms(doc: Document, targetId: string): void {
  const target = doc.getElementById(targetId);
  if (!target) return;

  // 从目标节点向上遍历到 body，移除 transform / 固定定位
  let node: HTMLElement | null = target;
  while (node && node !== doc.body) {
    const style = node.style;
    for (const prop of TRANSFORM_PROPS) {
      style.setProperty(prop, 'none', 'important');
    }
    const position = style.getPropertyValue('position');
    if (position === 'fixed' || position === 'sticky') {
      style.setProperty('position', 'static', 'important');
    }
    node = node.parentElement;
  }

  // 目标节点自身也不允许 transform/缩放
  for (const prop of TRANSFORM_PROPS) {
    target.style.setProperty(prop, 'none', 'important');
  }
}

async function renderElementToCanvas(element: HTMLElement, elementId: string): Promise<HTMLCanvasElement> {
  const [{ default: html2canvas }] = await Promise.all([import('html2canvas')]);

  try {
    return await html2canvas(element, {
      scale: SCALE,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: false,
      width: element.offsetWidth,
      height: element.offsetHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (doc, clonedNode) => {
        stripTransforms(doc, elementId);
        clonedNode.style.setProperty('transform', 'none', 'important');
        clonedNode.style.setProperty('filter', 'none', 'important');
        clonedNode.style.setProperty('-webkit-font-smoothing', 'antialiased');
      },
    });
  } catch (err) {
    console.warn('[pdf-export] scale=2 导出失败，降级到 scale=1:', err);
    return html2canvas(element, {
      scale: 1,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (doc) => stripTransforms(doc, elementId),
    });
  }
}

async function renderToCanvasById(elementId: string): Promise<HTMLCanvasElement> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`找不到预览元素 #${elementId}，请确认单证已加载`);
  }
  return renderElementToCanvas(element, elementId);
}

function addCanvasToPdf(
  pdf: InstanceType<typeof import('jspdf').jsPDF>,
  canvas: HTMLCanvasElement,
  orientation: PdfOrientation,
  isFirstPage: boolean,
): void {
  const a4Short = 210;
  const a4Long = 297;

  const pageWidth = orientation === 'landscape' ? a4Long : a4Short;
  const pageHeight = orientation === 'landscape' ? a4Short : a4Long;

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = pageWidth;
  // 将 canvas 等比缩放以铺满一页 A4；调用方（主证 / 附加表）保证
  // 元素固定为 A4 尺寸（210mm×297mm），所以这里直接按整页绘制，
  // 不再根据 canvas 实际像素高度做长图分页 —— 那会在不同 DPI /
  // 缩放比例下多算出一页空白。
  const imgHeight = pageHeight;

  if (!isFirstPage) {
    pdf.addPage([pageWidth, pageHeight], orientation);
  }

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
}

export async function exportToPDF(
  elementId: string,
  filename: string,
  options: PdfExportOptions = {},
): Promise<void> {
  const orientation = options.orientation ?? 'portrait';
  const [{ default: jsPDF }] = await Promise.all([import('jspdf')]);

  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  const canvas = await renderToCanvasById(elementId);

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  addCanvasToPdf(pdf, canvas, orientation, true);
  pdf.save(`${filename}.pdf`);
}

/**
 * 多个元素合并导出为一个 PDF，每个元素作为一个 section（可单独指定方向）。
 * 用于"出口许可证主证 + 附加信息表"等多页单证的合并导出。
 */
export async function exportMultiToPDF(
  sections: PdfSection[],
  filename: string,
): Promise<void> {
  if (!sections.length) {
    throw new Error('没有可导出的内容');
  }

  const [{ default: jsPDF }] = await Promise.all([import('jspdf')]);

  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  const firstOrientation = sections[0].orientation ?? 'portrait';
  const pdf = new jsPDF({
    orientation: firstOrientation,
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i];
    const orientation = section.orientation ?? 'portrait';
    // eslint-disable-next-line no-await-in-loop
    const canvas = await renderToCanvasById(section.elementId);
    addCanvasToPdf(pdf, canvas, orientation, i === 0);
  }

  pdf.save(`${filename}.pdf`);
}
