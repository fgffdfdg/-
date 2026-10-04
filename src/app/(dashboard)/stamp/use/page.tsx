'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, Download, Move } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { getStamps } from '@/lib/stamp/storage';
import type { SavedStamp, StampConfig } from '@/lib/stamp/types';
import { drawManualStamp } from '@/lib/stamp/renderer';

// 将印章渲染到 canvas 并返回 dataURL
function renderStampToDataUrl(stamp: SavedStamp, size: number): Promise<string> {
  return new Promise((resolve) => {
    if (stamp.type === 'photo') {
      // 照片章直接用 imageData
      resolve(stamp.imageData);
      return;
    }

    // 手动章：用渲染引擎
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve(''); return; }
    drawManualStamp(ctx, stamp.config as StampConfig);
    resolve(canvas.toDataURL('image/png'));
  });
}

export default function StampUsePage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [stamps, setStamps] = useState<SavedStamp[]>([]);
  const [selectedStamp, setSelectedStamp] = useState<SavedStamp | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [fileImgSrc, setFileImgSrc] = useState<string | null>(null);

  // 印章位置
  const [stampPos, setStampPos] = useState({ x: 100, y: 100 });
  const [stampSize, setStampSize] = useState(120);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => { setStamps(getStamps()); }, []);

  const handleFileUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setFileName(file.name);
    setFileType(file.type === 'application/pdf' ? 'pdf' : 'image');

    // 如果是图片，生成预览 src
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFileImgSrc(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFileImgSrc(null);
    }
  };

  // 拖拽逻辑
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left - stampPos.x, y: e.clientY - rect.top - stampPos.y });
    setDragging(true);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setStampPos({
      x: Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, rect.width - stampSize)),
      y: Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, rect.height - stampSize)),
    });
  }, [dragging, dragOffset, stampSize]);

  const handleMouseUp = useCallback(() => { setDragging(false); }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  // 导出盖章后的文件
  const handleExport = async () => {
    if (!selectedStamp || !fileUrl) return;

    // 渲染印章图片
    const stampDataUrl = await renderStampToDataUrl(selectedStamp, 300);

    if (fileType === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = fileUrl;
      await new Promise(r => { img.onload = r; });

      const stampImg = new Image();
      stampImg.src = stampDataUrl;
      await new Promise(r => { stampImg.onload = r; });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      ctx.drawImage(stampImg, stampPos.x, stampPos.y, stampSize, stampSize);

      const link = document.createElement('a');
      link.download = `stamped_${fileName}`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } else {
      const pdfBytes = await fetch(fileUrl).then(r => r.arrayBuffer());
      const pdfDoc = await PDFDocument.load(pdfBytes);

      const stampBytes = await fetch(stampDataUrl).then(r => r.arrayBuffer());
      const stampImg = await pdfDoc.embedPng(stampBytes);

      const pages = pdfDoc.getPages();
      const page = pages[0];
      const { height } = page.getSize();
      page.drawImage(stampImg, {
        x: stampPos.x,
        y: height - stampPos.y - stampSize,
        width: stampSize,
        height: stampSize,
      });

      const outBytes = await pdfDoc.save();
      const blob = new Blob([outBytes as BlobPart], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.download = `stamped_${fileName}`;
      link.href = URL.createObjectURL(blob);
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/stamp')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">文件盖章</h1>
          <p className="text-muted-foreground text-sm">
            选择印章，上传文件，拖拽定位后导出
          </p>
        </div>
      </div>

      {/* Step 1: Select Stamp */}
      <Card>
        <CardHeader><CardTitle className="text-base">选择印章</CardTitle></CardHeader>
        <CardContent>
          {stamps.length === 0 ? (
            <p className="text-muted-foreground text-sm">暂无印章，请先去创建</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {stamps.map(s => (
                <button
                  key={s.id}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                    selectedStamp?.id === s.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedStamp(s)}
                >
                  <img src={s.imageData} alt={s.name} className="w-16 h-16 object-contain" />
                  <span className="text-xs text-muted-foreground max-w-20 truncate">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Upload File */}
      <Card>
        <CardHeader><CardTitle className="text-base">上传文件</CardTitle></CardHeader>
        <CardContent>
          {!fileUrl ? (
            <label className="flex flex-col items-center gap-2 p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">点击上传 PDF 或图片</p>
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
              />
            </label>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm">{fileName}</span>
              <Button size="sm" variant="outline" onClick={() => { setFileUrl(null); setFileName(''); setFileType(null); setFileImgSrc(null); }}>
                重新上传
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Position */}
      {fileUrl && selectedStamp && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">拖拽定位印章</CardTitle>
              <div className="flex items-center gap-2">
                <Move className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">拖拽移动</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {/* 文件预览区 */}
              <div
                ref={containerRef}
                className="relative flex-1 min-h-[400px] rounded-lg border bg-muted/30 overflow-hidden cursor-move select-none"
                onMouseDown={handleMouseDown}
              >
                {/* 文件底图 */}
                {fileType === 'image' && fileImgSrc && (
                  <img src={fileImgSrc} alt="底图" className="w-full h-full object-contain pointer-events-none" />
                )}
                {fileType === 'pdf' && (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    PDF 文件（导出时将盖章到第一页）
                  </div>
                )}

                {/* 印章 */}
                <img
                  src={selectedStamp.imageData}
                  alt="印章"
                  className="absolute pointer-events-none"
                  style={{
                    left: stampPos.x,
                    top: stampPos.y,
                    width: stampSize,
                    height: stampSize,
                  }}
                />
              </div>

              {/* 控制面板 */}
              <div className="w-48 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">印章大小</label>
                  <input
                    type="range"
                    min={40}
                    max={300}
                    value={stampSize}
                    onChange={e => setStampSize(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-muted-foreground">{stampSize}px</span>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">位置</label>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>X: {Math.round(stampPos.x)}</span>
                    <span>Y: {Math.round(stampPos.y)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export */}
      {fileUrl && selectedStamp && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.push('/stamp')}>
            取消
          </Button>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出盖章文件
          </Button>
        </div>
      )}
    </div>
  );
}
