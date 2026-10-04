"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  Upload,
  Loader2,
  Save,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  type StampConfig,
  type StampShape,
  type BorderStyle,
  type StampColor,
  type StampFont,
  type CenterPatternType,
  type ArcTextZone,
  type LineTextZone,
  type CenterZone,
  type MainTextZone,
  SHAPE_OPTIONS,
  BORDER_STYLE_OPTIONS,
  STAMP_COLOR_OPTIONS,
  FONT_OPTIONS,
  CENTER_PATTERN_OPTIONS,
  CENTER_SIZE_OPTIONS,
  LINE_TEXT_POSITION_OPTIONS,
  MAIN_TEXT_LAYOUT_OPTIONS,
  isRoundShape,
  isSquareShape,
  getColorHex,
} from "@/lib/stamp/types";
import { drawManualStamp } from "@/lib/stamp/renderer";
import { saveStamp } from "@/lib/stamp/storage";

export default function ReferenceStampPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [config, setConfig] = useState<StampConfig | null>(null);
  const [name, setName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // 渲染预览
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !config) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawManualStamp(ctx, config);
  }, [config]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // 上传图片并调用 AI 分析
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAnalyzeError(null);

    // 转为 base64
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setReferenceImage(dataUrl);
      setAnalyzing(true);
      setAnalyzeError(null);

      try {
        const res = await fetch("/api/stamp/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: dataUrl }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "分析失败");
        }

        if (json.success && json.config) {
          setConfig(json.config as StampConfig);
        } else {
          throw new Error("AI 未能识别印章内容，请换一张更清晰的图片");
        }
      } catch (err) {
        setAnalyzeError(
          err instanceof Error ? err.message : "分析失败，请重试"
        );
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 更新配置
  const updateConfig = (updates: Partial<StampConfig>) => {
    setConfig((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const updateZoneA = (updates: Partial<ArcTextZone>) => {
    setConfig((prev) =>
      prev?.zoneA ? { ...prev, zoneA: { ...prev.zoneA, ...updates } } : prev
    );
  };

  const updateZoneB = (updates: Partial<ArcTextZone>) => {
    setConfig((prev) =>
      prev?.zoneB ? { ...prev, zoneB: { ...prev.zoneB, ...updates } } : prev
    );
  };

  const updateZoneC = (updates: Partial<LineTextZone>) => {
    setConfig((prev) =>
      prev?.zoneC ? { ...prev, zoneC: { ...prev.zoneC, ...updates } } : prev
    );
  };

  const updateZoneD = (updates: Partial<CenterZone>) => {
    setConfig((prev) =>
      prev?.zoneD ? { ...prev, zoneD: { ...prev.zoneD, ...updates } } : prev
    );
  };

  const updateZoneE = (updates: Partial<MainTextZone>) => {
    setConfig((prev) =>
      prev?.zoneE ? { ...prev, zoneE: { ...prev.zoneE, ...updates } } : prev
    );
  };

  const updateZoneF = (updates: Partial<LineTextZone>) => {
    setConfig((prev) =>
      prev?.zoneF ? { ...prev, zoneF: { ...prev.zoneF, ...updates } } : prev
    );
  };

  const handleSave = async () => {
    if (!config) return;
    if (!name.trim()) {
      setError("请输入印章名称");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        setError("画布未就绪");
        return;
      }

      const previewDataUrl = canvas.toDataURL("image/png");

      saveStamp({
        id: `stamp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim(),
        type: "manual",
        imageData: previewDataUrl,
        config,
        createdAt: Date.now(),
      });

      router.push("/stamp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const isRound = config ? isRoundShape(config.shape) : false;
  const isSquare = config ? isSquareShape(config.shape) : false;

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI 参照制作</h1>
          <p className="text-muted-foreground">
            上传印章参考图，AI 自动识别并生成可编辑的印章
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_360px]">
        {/* 左：参考图 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4" />
              参考图
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 transition-colors hover:bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              {referenceImage ? (
                <img
                  src={referenceImage}
                  alt="参考图"
                  className="max-h-[280px] rounded object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                  <Upload className="h-10 w-10" />
                  <div className="text-center">
                    <p className="font-medium">点击上传印章参考图</p>
                    <p className="text-sm">支持 JPG、PNG 格式</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
            {analyzing && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI 正在识别印章内容...
              </div>
            )}
            {analyzeError && (
              <p className="mt-4 text-center text-sm text-destructive">
                {analyzeError}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 中：预览 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              识别结果预览
            </CardTitle>
            <CardDescription>可在此页面微调识别结果</CardDescription>
          </CardHeader>
          <CardContent>
            {config ? (
              <div className="flex min-h-[300px] items-center justify-center rounded-lg bg-muted/30 p-4">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={300}
                  className="max-h-[280px]"
                />
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg bg-muted/30 text-muted-foreground">
                <Sparkles className="mb-3 h-10 w-10 opacity-50" />
                <p className="text-sm">上传参考图后，AI 识别结果将显示在这里</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右：配置面板 */}
        {config && (
          <div className="space-y-4">
            {/* 基本属性 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">基本属性</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">形状</Label>
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={config.shape}
                    onChange={(e) =>
                      updateConfig({ shape: e.target.value as StampShape })
                    }
                  >
                    {SHAPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">宽(mm)</Label>
                    <Input
                      type="number"
                      className="h-8 text-sm"
                      value={config.widthMm}
                      min={10}
                      max={80}
                      onChange={(e) =>
                        updateConfig({ widthMm: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">高(mm)</Label>
                    <Input
                      type="number"
                      className="h-8 text-sm"
                      value={config.heightMm}
                      min={10}
                      max={80}
                      onChange={(e) =>
                        updateConfig({ heightMm: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">边框</Label>
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={config.borderStyle}
                      onChange={(e) =>
                        updateConfig({
                          borderStyle: e.target.value as BorderStyle,
                        })
                      }
                    >
                      {BORDER_STYLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">颜色</Label>
                    <select
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={config.color}
                      onChange={(e) =>
                        updateConfig({ color: e.target.value as StampColor })
                      }
                    >
                      {STAMP_COLOR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 识别到的内容区域 - 紧凑编辑 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">识别内容（可微调）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isRound && (
                  <>
                    {config.zoneA && (
                      <div className="space-y-1">
                        <Label className="text-xs">外圈环绕文字</Label>
                        <Input
                          className="h-8 text-sm"
                          value={config.zoneA.text}
                          onChange={(e) =>
                            updateZoneA({ text: e.target.value })
                          }
                        />
                      </div>
                    )}
                    {config.zoneB && (
                      <div className="space-y-1">
                        <Label className="text-xs">内圈环绕文字</Label>
                        <Input
                          className="h-8 text-sm"
                          value={config.zoneB.text}
                          onChange={(e) =>
                            updateZoneB({ text: e.target.value })
                          }
                        />
                      </div>
                    )}
                    {config.zoneC && (
                      <div className="space-y-1">
                        <Label className="text-xs">横排文字</Label>
                        <div className="flex gap-2">
                          <Input
                            className="h-8 flex-1 text-sm"
                            value={config.zoneC.text}
                            onChange={(e) =>
                              updateZoneC({ text: e.target.value })
                            }
                          />
                          <select
                            className="h-8 w-20 rounded-md border border-input bg-background px-1 text-sm"
                            value={config.zoneC.position}
                            onChange={(e) =>
                              updateZoneC({
                                position: e.target.value as
                                  | "top"
                                  | "center"
                                  | "bottom",
                              })
                            }
                          >
                            {LINE_TEXT_POSITION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                    {config.zoneD && (
                      <div className="space-y-1">
                        <Label className="text-xs">中心图案</Label>
                        <select
                          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                          value={config.zoneD.type}
                          onChange={(e) =>
                            updateZoneD({
                              type: e.target.value as CenterPatternType,
                            })
                          }
                        >
                          {CENTER_PATTERN_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {config.zoneD.type === "text" && (
                          <Input
                            className="mt-1 h-8 text-sm"
                            value={config.zoneD.text || ""}
                            placeholder="中心文字"
                            onChange={(e) =>
                              updateZoneD({ text: e.target.value })
                            }
                          />
                        )}
                      </div>
                    )}
                    {config.zoneF && (
                      <div className="space-y-1">
                        <Label className="text-xs">底部信息</Label>
                        <Input
                          className="h-8 text-sm"
                          value={config.zoneF.text}
                          onChange={(e) =>
                            updateZoneF({ text: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </>
                )}
                {isSquare && config.zoneE && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">主体文字</Label>
                      <Input
                        className="h-8 text-sm"
                        value={config.zoneE.text}
                        onChange={(e) =>
                          updateZoneE({ text: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">排列方式</Label>
                      <select
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                        value={config.zoneE.layout}
                        onChange={(e) =>
                          updateZoneE({
                            layout: e.target.value as "vertical" | "horizontal",
                          })
                        }
                      >
                        {MAIN_TEXT_LAYOUT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 保存 */}
            <Card>
              <CardContent className="space-y-3 pt-4">
                <div className="space-y-2">
                  <Label className="text-sm">印章名称</Label>
                  <Input
                    value={name}
                    placeholder="如：公司公章"
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button
                  onClick={handleSave}
                  disabled={saving || !config}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "保存中..." : "保存到印章库"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setConfig(null);
                    setReferenceImage(null);
                    setName("");
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  重新开始
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
