'use client';

import { Download } from 'lucide-react';

interface InstallButtonsProps {
  type: 'hero' | 'cta';
}

export function InstallButtons({ type }: InstallButtonsProps) {
  const handleInstall = () => {
    // 实际部署时替换为真实的 Chrome Web Store 链接
    window.open('https://chrome.google.com/webstore', '_blank');
  };

  if (type === 'hero') {
    return (
      <button
        onClick={handleInstall}
        className="bg-primary text-primary-foreground px-6 py-3 rounded-md text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all inline-flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        安装扩展
      </button>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className="bg-primary-foreground text-primary px-6 py-3 rounded-md text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all inline-flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      安装 CarClip 扩展
    </button>
  );
}