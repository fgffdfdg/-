'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CopyDemoButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textToCopy = `2023 Toyota Land Cruiser 4.0L GXR
Year: 2023
Mileage: 28,000 km
Displacement: 4.0L
Transmission: Automatic
Emission Standard: Euro VI
Price: $68,500

Extracted from autohome.com.cn via CarClip`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-auto bg-primary-foreground/20 text-primary-foreground px-3 py-1 rounded text-xs font-medium hover:bg-primary-foreground/30 transition-colors inline-flex items-center gap-1.5"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy All
        </>
      )}
    </button>
  );
}