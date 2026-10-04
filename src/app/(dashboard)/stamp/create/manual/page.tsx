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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  Save,
  RotateCcw,
  Palette,
  Type,
  Circle,
  Square,
} from "lucide-react";
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
  DEFAULT_STAMP_CONFIG,
  isRoundShape,
  isSquareShape,
  getDefaultSize,
  getColorHex,
} from "@/lib/stamp/types";
import { drawManualStamp } from "@/lib/stamp/renderer";
import { saveStamp } from "@/lib/stamp/storage";

export default function ManualStampPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState<StampConfig>({
    ...DEFAULT_STAMP_CONFIG,
  });
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRound = isRoundShape(config.shape);
  const isSquare = isSquareShape(config.shape);

  // 渲染预览
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawManualStamp(ctx, config);
  }, [config]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // 更新全局属性
  const updateGlobal = <K extends keyof StampConfig>(
    key: K,
    value: StampConfig[K]
  ) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      // 切换形状时，自动调整尺寸
      if (key === "shape") {
        const size = getDefaultSize(value as StampShape);
        next.widthMm = size.widthMm;
        next.heightMm = size.heightMm;
      }
      return next;
    });
  };

  // 更新区域
  const updateZoneA = (updates: Partial<ArcTextZone>) => {
    setConfig((prev) => ({
      ...prev,
      zoneA: prev.zoneA ? { ...prev.zoneA, ...updates } : null,
    }));
  };

  const updateZoneB = (updates: Partial<ArcTextZone>) => {
    setConfig((prev) => ({
      ...prev,
      zoneB: prev.zoneB ? { ...prev.zoneB, ...updates } : null,
    }));
  };

  const updateZoneC = (updates: Partial<LineTextZone>) => {
    setConfig((prev) => ({
      ...prev,
      zoneC: prev.zoneC ? { ...prev.zoneC, ...updates } : null,
    }));
  };

  const updateZoneD = (updates: Partial<CenterZone>) => {
    setConfig((prev) => ({
      ...prev,
      zoneD: prev.zoneD ? { ...prev.zoneD, ...updates } : null,
    }));
  };

  const updateZoneE = (updates: Partial<MainTextZone>) => {
    setConfig((prev) => ({
      ...prev,
      zoneE: prev.zoneE ? { ...prev.zoneE, ...updates } : null,
    }));
  };

  const updateZoneF = (updates: Partial<LineTextZone>) => {
    setConfig((prev) => ({
      ...prev,
      zoneF: prev.zoneF ? { ...prev.zoneF, ...updates } : null,
    }));
  };

  // 启用/禁用区域
  const toggleZone = (
    zone: "zoneA" | "zoneB" | "zoneC" | "zoneD" | "zoneF"
  ) => {
    setConfig((prev) => {
      if (prev[zone]) {
        return { ...prev, [zone]: null };
      }
      // 启用时给默认值
      switch (zone) {
        case "zoneA":
          return {
            ...prev,
            zoneA: { text: "", fontFamily: "simsun" as StampFont, fontSizePx: 14, letterSpacingPx: 2 },
          };
        case "zoneB":
          return {
            ...prev,
            zoneB: { text: "", fontFamily: "arial" as StampFont, fontSizePx: 8, letterSpacingPx: 1 },
          };
        case "zoneC":
          return {
            ...prev,
            zoneC: { text: "", position: "top" as const, fontFamily: "simsun" as StampFont, fontSizePx: 12 },
          };
        case "zoneD":
          return {
            ...prev,
            zoneD: { type: "star" as CenterPatternType, size: "medium" as const },
          };
        case "zoneF":
          return {
            ...prev,
            zoneF: { text: "", position: "bottom" as const, fontFamily: "arial" as StampFont, fontSizePx: 8 },
          };
        default:
          return prev;
      }
    });
  };

  const toggleZoneE = () => {
    setConfig((prev) => {
      if (prev.zoneE) {
        return { ...prev, zoneE: null };
      }
      return {
        ...prev,
        zoneE: { text: "", layout: "vertical" as const, fontFamily: "kaiti" as StampFont, fontSizePx: 28 },
      };
    });
  };

  const handleSave = async () => {
    setError(null);

    if (!name.trim()) {
      setError("请输入印章名称");
      return;
    }

    // 至少有一个内容区域
    const hasContent =
      config.zoneA?.text ||
      config.zoneB?.text ||
      config.zoneC?.text ||
      config.zoneD ||
      config.zoneE?.text ||
      config.zoneF?.text;

    if (!hasContent) {
      setError("请至少添加一个内容区域（文字或图案）");
      return;
    }

    setSaving(true);
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

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">手动设计印章</h1>
          <p className="text-muted-foreground">
            自定义印章形状、文字和样式
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* 左侧：配置面板 */}
        <div className="space-y-4">
          {/* 全局属性 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                基本属性
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>形状</Label>
                  <Select
                    value={config.shape}
                    onValueChange={(v) => updateGlobal("shape", v as StampShape)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHAPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>尺寸（mm）</Label>
                  {isRound ? (
                    <Input
                      type="number"
                      value={config.widthMm}
                      min={10}
                      max={80}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        updateGlobal("widthMm", v);
                        updateGlobal("heightMm", v);
                      }}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.widthMm}
                        min={10}
                        max={80}
                        onChange={(e) =>
                          updateGlobal("widthMm", Number(e.target.value))
                        }
                      />
                      <span className="text-muted-foreground">×</span>
                      <Input
                        type="number"
                        value={config.heightMm}
                        min={10}
                        max={80}
                        onChange={(e) =>
                          updateGlobal("heightMm", Number(e.target.value))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>边框样式</Label>
                  <Select
                    value={config.borderStyle}
                    onValueChange={(v) =>
                      updateGlobal("borderStyle", v as BorderStyle)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BORDER_STYLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>边框粗细</Label>
                  <Input
                    type="number"
                    value={config.borderWidth}
                    min={1}
                    max={8}
                    onChange={(e) =>
                      updateGlobal("borderWidth", Number(e.target.value))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>主色</Label>
                  <Select
                    value={config.color}
                    onValueChange={(v) =>
                      updateGlobal("color", v as StampColor)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAMP_COLOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: opt.hex }}
                            />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="distressed"
                      checked={config.distressed}
                      onCheckedChange={(v) => updateGlobal("distressed", v)}
                    />
                    <Label htmlFor="distressed">做旧效果</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 内容区域 - 根据形状动态显示 */}
          {isRound && (
            <>
              {/* Zone A - 外圈环绕文字 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Type className="h-4 w-4" />
                      外圈环绕文字
                    </CardTitle>
                    <Switch
                      checked={!!config.zoneA}
                      onCheckedChange={() => toggleZone("zoneA")}
                    />
                  </div>
                  {config.zoneA && (
                    <CardDescription>沿印章上边缘弧形排列的文字</CardDescription>
                  )}
                </CardHeader>
                {config.zoneA && (
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>文字内容</Label>
                      <Input
                        value={config.zoneA.text}
                        placeholder="如：某某国际贸易有限公司"
                        onChange={(e) => updateZoneA({ text: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>字体</Label>
                        <Select
                          value={config.zoneA.fontFamily}
                          onValueChange={(v) =>
                            updateZoneA({ fontFamily: v as StampFont })
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>字号（{config.zoneA.fontSizePx}px）</Label>
                        <input
                          type="range"
                          min={8}
                          max={24}
                          value={config.zoneA.fontSizePx}
                          onChange={(e) =>
                            updateZoneA({ fontSizePx: Number(e.target.value) })
                          }
                          className="mt-2 w-full"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>字间距（{config.zoneA.letterSpacingPx}px）</Label>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        value={config.zoneA.letterSpacingPx}
                        onChange={(e) =>
                          updateZoneA({
                            letterSpacingPx: Number(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Zone B - 内圈环绕文字 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Type className="h-4 w-4" />
                      内圈环绕文字
                    </CardTitle>
                    <Switch
                      checked={!!config.zoneB}
                      onCheckedChange={() => toggleZone("zoneB")}
                    />
                  </div>
                  {config.zoneB && (
                    <CardDescription>沿印章下边缘弧形排列的文字（如英文名）</CardDescription>
                  )}
                </CardHeader>
                {config.zoneB && (
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>文字内容</Label>
                      <Input
                        value={config.zoneB.text}
                        placeholder="如：CO., LTD"
                        onChange={(e) => updateZoneB({ text: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>字体</Label>
                        <Select
                          value={config.zoneB.fontFamily}
                          onValueChange={(v) =>
                            updateZoneB({ fontFamily: v as StampFont })
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>字号（{config.zoneB.fontSizePx}px）</Label>
                        <input
                          type="range"
                          min={6}
                          max={16}
                          value={config.zoneB.fontSizePx}
                          onChange={(e) =>
                            updateZoneB({ fontSizePx: Number(e.target.value) })
                          }
                          className="mt-2 w-full"
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Zone C - 横排文字 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Type className="h-4 w-4" />
                      横排文字
                    </CardTitle>
                    <Switch
                      checked={!!config.zoneC}
                      onCheckedChange={() => toggleZone("zoneC")}
                    />
                  </div>
                  {config.zoneC && (
                    <CardDescription>水平排列的文字，如"合同专用章"</CardDescription>
                  )}
                </CardHeader>
                {config.zoneC && (
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>文字内容</Label>
                      <Input
                        value={config.zoneC.text}
                        placeholder="如：合同专用章"
                        onChange={(e) => updateZoneC({ text: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>垂直位置</Label>
                        <Select
                          value={config.zoneC.position}
                          onValueChange={(v) =>
                            updateZoneC({
                              position: v as "top" | "center" | "bottom",
                            })
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LINE_TEXT_POSITION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>字体</Label>
                        <Select
                          value={config.zoneC.fontFamily}
                          onValueChange={(v) =>
                            updateZoneC({ fontFamily: v as StampFont })
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>字号（{config.zoneC.fontSizePx}px）</Label>
                      <input
                        type="range"
                        min={8}
                        max={24}
                        value={config.zoneC.fontSizePx}
                        onChange={(e) =>
                          updateZoneC({ fontSizePx: Number(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Zone D - 中心图案 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Type className="h-4 w-4" />
                      中心图案
                    </CardTitle>
                    <Switch
                      checked={!!config.zoneD}
                      onCheckedChange={() => toggleZone("zoneD")}
                    />
                  </div>
                  {config.zoneD && (
                    <CardDescription>印章正中间的图案</CardDescription>
                  )}
                </CardHeader>
                {config.zoneD && (
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>图案类型</Label>
                        <Select
                          value={config.zoneD.type}
                          onValueChange={(v) =>
                            updateZoneD({
                              type: v as CenterPatternType,
                              text:
                                v === "text" ? config.zoneD?.text || "" : undefined,
                            })
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CENTER_PATTERN_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>大小</Label>
                        <Select
                          value={config.zoneD.size}
                          onValueChange={(v) =>
                            updateZoneD({
                              size: v as "small" | "medium" | "large",
                            })
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CENTER_SIZE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {config.zoneD.type === "text" && (
                      <div className="space-y-2">
                        <Label>中心文字</Label>
                        <Input
                          value={config.zoneD.text || ""}
                          placeholder="如：税"
                          onChange={(e) =>
                            updateZoneD({ text: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Zone F - 底部信息 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Type className="h-4 w-4" />
                      底部信息
                    </CardTitle>
                    <Switch
                      checked={!!config.zoneF}
                      onCheckedChange={() => toggleZone("zoneF")}
                    />
                  </div>
                  {config.zoneF && (
                    <CardDescription>印章底部的小字信息（税号、编号等）</CardDescription>
                  )}
                </CardHeader>
                {config.zoneF && (
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>文字内容</Label>
                      <Input
                        value={config.zoneF.text}
                        placeholder="如：91440300..."
                        onChange={(e) => updateZoneF({ text: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>字体</Label>
                        <Select
                          value={config.zoneF.fontFamily}
                          onValueChange={(v) =>
                            updateZoneF({ fontFamily: v as StampFont })
                          }
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>字号（{config.zoneF.fontSizePx}px）</Label>
                        <input
                          type="range"
                          min={6}
                          max={14}
                          value={config.zoneF.fontSizePx}
                          onChange={(e) =>
                            updateZoneF({ fontSizePx: Number(e.target.value) })
                          }
                          className="mt-2 w-full"
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            </>
          )}

          {/* 方形/矩形：名章模式 */}
          {isSquare && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Type className="h-4 w-4" />
                    主体文字
                  </CardTitle>
                  <Switch
                    checked={!!config.zoneE}
                    onCheckedChange={toggleZoneE}
                  />
                </div>
                {config.zoneE && (
                  <CardDescription>名章的主体文字（人名、公司名等）</CardDescription>
                )}
              </CardHeader>
              {config.zoneE && (
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>文字内容</Label>
                    <Input
                      value={config.zoneE.text}
                      placeholder="如：张三"
                      onChange={(e) => updateZoneE({ text: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>排列方式</Label>
                      <Select
                        value={config.zoneE.layout}
                        onValueChange={(v) =>
                          updateZoneE({
                            layout: v as "vertical" | "horizontal",
                          })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MAIN_TEXT_LAYOUT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>字体</Label>
                      <Select
                        value={config.zoneE.fontFamily}
                        onValueChange={(v) =>
                          updateZoneE({ fontFamily: v as StampFont })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>字号（{config.zoneE.fontSizePx}px）</Label>
                    <input
                      type="range"
                      min={12}
                      max={40}
                      value={config.zoneE.fontSizePx}
                      onChange={(e) =>
                        updateZoneE({ fontSizePx: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* 右侧：预览 + 保存 */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>预览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center rounded-lg bg-muted/50 p-8">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={300}
                  className="max-h-[300px]"
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>印章名称</Label>
                  <Input
                    value={name}
                    placeholder="如：公司公章"
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "保存中..." : "保存印章"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setConfig({ ...DEFAULT_STAMP_CONFIG });
                      setName("");
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
