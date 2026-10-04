'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Upload, ArrowLeft, Check } from 'lucide-react';
import { processPhotoStamp } from '@/lib/stamp/photo-processor';
import { saveStamp } from '@/lib/stamp/storage';
import { SavedStamp } from '@/lib/stamp/types';

export default function PhotoStampPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState(30);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setProcessing(true);
    try {
      // 原始预览
      const origUrl = URL.createObjectURL(file);
      setOriginalPreview(origUrl);

      // 去背景处理
      const result = await processPhotoStamp(file, threshold);
      setPreview(result);
      if (!name) {
        setName(file.name.replace(/\.[^.]+$/, ''));
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = () => {
    if (!preview || !name) return;
    const stamp: SavedStamp = {
      id: `stamp_${Date.now()}`,
      name,
      type: 'photo',
      imageData: preview,
      createdAt: Date.now(),
    };
    saveStamp(stamp);
    router.push('/stamp');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/stamp')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">上传照片章</h1>
          <p className="text-muted-foreground text-sm">
            上传实体印章照片，自动去除背景
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Upload & Config */}
        <Card>
          <CardHeader>
            <CardTitle>上传照片</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {originalPreview ? (
                <img
                  src={originalPreview}
                  alt="原始照片"
                  className="max-h-48 mx-auto object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-10 w-10" />
                  <p className="text-sm">点击上传印章照片</p>
                  <p className="text-xs">支持 JPG、PNG 格式</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            <div className="space-y-2">
              <Label>印章名称</Label>
              <Input
                placeholder="例如：公司公章"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>背景去除阈值</Label>
                <span className="text-sm text-muted-foreground">{threshold}</span>
              </div>
              <Slider
                value={[threshold]}
                min={5}
                max={80}
                step={1}
                onValueChange={v => setThreshold(v[0])}
              />
              <p className="text-xs text-muted-foreground">
                值越小去除越严格，值越大保留越多
              </p>
            </div>

            {preview && (
              <Button onClick={handleSave} className="w-full" disabled={!name}>
                <Check className="mr-2 h-4 w-4" />
                保存印章
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Right: Preview */}
        <Card>
          <CardHeader>
            <CardTitle>处理后预览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-square bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMGYwIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMGYwZjAiLz48L3N2Zz4=')] rounded-lg flex items-center justify-center">
              {processing ? (
                <p className="text-muted-foreground">处理中...</p>
              ) : preview ? (
                <img
                  src={preview}
                  alt="处理后"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <p className="text-muted-foreground text-sm">上传照片后显示预览</p>
              )}
            </div>
            {preview && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                棋盘格背景表示透明区域
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
