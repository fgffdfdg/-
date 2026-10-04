/** 照片章处理：去背景、清理毛边 */

/** 简单的背景移除（基于颜色阈值） */
export function removeBackground(
  imageData: ImageData,
  threshold = 30,
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // 采样四角颜色作为背景色
  const corners = [
    getPixel(data, width, 0, 0),
    getPixel(data, width, width - 1, 0),
    getPixel(data, width, 0, height - 1),
    getPixel(data, width, width - 1, height - 1),
  ];
  const bgR = corners.reduce((s, c) => s + c[0], 0) / 4;
  const bgG = corners.reduce((s, c) => s + c[1], 0) / 4;
  const bgB = corners.reduce((s, c) => s + c[2], 0) / 4;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = Math.sqrt(
      (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2,
    );
    if (dist < threshold) {
      data[i + 3] = 0; // 设为透明
    } else {
      data[i + 3] = 255; // 不透明
    }
  }

  return imageData;
}

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): [number, number, number] {
  const idx = (y * width + x) * 4;
  return [data[idx], data[idx + 1], data[idx + 2]];
}

/** 处理上传的照片章图片，返回去背景后的 dataURL */
export async function processPhotoStamp(
  file: File,
  threshold = 30,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法获取 canvas 上下文'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const processed = removeBackground(imageData, threshold);
      ctx.putImageData(processed, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });
}
