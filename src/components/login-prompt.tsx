"use client";

import { X, LogIn, Shield, Cloud, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LoginPromptProps {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
  title?: string;
  description?: string;
}

export function LoginPrompt({
  open,
  onClose,
  onLogin,
  title = "登录后享受更多服务",
  description = "登录后可云端保存数据，多设备同步",
}: LoginPromptProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 bg-navy/10 rounded-2xl flex items-center justify-center">
              <LogIn className="w-7 h-7 text-navy" />
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-center text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {/* 登录好处列表 */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                <Cloud className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">云端存储</p>
                <p className="text-xs text-muted-foreground">数据自动保存，换设备不丢失</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">多设备同步</p>
                <p className="text-xs text-muted-foreground">手机、电脑随时查看</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">安全可靠</p>
                <p className="text-xs text-muted-foreground">数据加密存储，隐私保护</p>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="space-y-2">
            <Button
              onClick={onLogin}
              className="w-full bg-navy hover:bg-navy/90"
            >
              <LogIn className="mr-2 h-4 w-4" />
              立即登录
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full text-muted-foreground"
            >
              稍后再说
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook: 用于触发登录引导
import { useState } from "react";

export function useLoginPrompt() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<{
    title?: string;
    description?: string;
    onConfirm?: () => void;
  }>({});

  const show = (config?: { title?: string; description?: string; onConfirm?: () => void }) => {
    setConfig(config ?? {});
    setOpen(true);
  };

  const hide = () => {
    setOpen(false);
    setConfig({});
  };

  const handleLogin = () => {
    hide();
    config.onConfirm?.();
    // 跳转到登录页，带上当前页面作为回调
    const currentPath = window.location.pathname;
    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
  };

  return {
    open,
    show,
    hide,
    LoginPrompt: (
      <LoginPrompt
        open={open}
        onClose={hide}
        onLogin={handleLogin}
        title={config.title}
        description={config.description}
      />
    ),
  };
}
