"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ImageIcon,
  Trash2,
  Stamp,
  Upload,
  Camera,
  PenTool,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type SavedStamp,
  getColorHex,
} from "@/lib/stamp/types";
import { getStamps, deleteStamp } from "@/lib/stamp/storage";

// 印章预览组件
function StampPreview({ stamp, size = 80 }: { stamp: SavedStamp; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (stamp.type === "photo") {
      // 照片章：加载图片绘制
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      };
      img.src = stamp.imageData;
    } else {
      // 手动章：用 imageData 预览
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (size - w) / 2;
        const y = (size - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      };
      img.src = stamp.imageData;
    }
  }, [stamp, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="h-auto w-full"
    />
  );
}

export default function StampPage() {
  const router = useRouter();
  const [stamps, setStamps] = useState<SavedStamp[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<SavedStamp | null>(null);

  const refreshStamps = useCallback(() => {
    setStamps(getStamps());
  }, []);

  useEffect(() => {
    refreshStamps();
  }, [refreshStamps]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteStamp(deleteTarget.id);
    setDeleteTarget(null);
    refreshStamps();
  };

  const getStampLabel = (stamp: SavedStamp) => {
    if (stamp.type === "photo") return "照片章";
    return "手动设计";
  };

  const getStampColor = (stamp: SavedStamp) => {
    if (stamp.type === "photo") return "red";
    if (stamp.config && "color" in stamp.config) {
      return (stamp.config as { color?: string }).color || "red";
    }
    return "red";
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">印章工具</h1>
          <p className="text-muted-foreground">
            制作和管理印章，支持照片提取、手动设计和 AI 参照制作
          </p>
        </div>
      </div>

      {/* 创建入口 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card
          className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
          onClick={() => router.push("/stamp/create/photo")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">照片章</CardTitle>
                <CardDescription>从实体印章照片提取</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
          onClick={() => router.push("/stamp/create/manual")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <PenTool className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">手动设计</CardTitle>
                <CardDescription>自定义设计印章样式</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
          onClick={() => router.push("/stamp/create/reference")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">AI 参照制作</CardTitle>
                <CardDescription>上传参考图智能生成</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* 印章库 */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">我的印章库</h2>
        {stamps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Stamp className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">还没有印章</p>
                <p className="text-sm text-muted-foreground">
                  通过照片提取或手动设计创建你的第一个印章
                </p>
              </div>
              <Button onClick={() => router.push("/stamp/create/manual")}>
                <Plus className="mr-2 h-4 w-4" />
                创建印章
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stamps.map((stamp) => (
              <Card
                key={stamp.id}
                className="group relative overflow-hidden transition-all hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">
                        {stamp.name}
                      </CardTitle>
                      <CardDescription>{getStampLabel(stamp)}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <span className="text-lg leading-none">···</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(stamp)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center rounded-lg bg-muted/30 p-4">
                    <StampPreview stamp={stamp} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {new Date(stamp.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        getStampColor(stamp) === "red"
                          ? "bg-red-50 text-red-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {getStampColor(stamp) === "red" ? "红色" : "蓝色"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 删除确认 */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除印章</DialogTitle>
            <DialogDescription>
              确定要删除「{deleteTarget?.name}」吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
