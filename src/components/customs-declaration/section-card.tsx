'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionCard({
  icon,
  title,
  subtitle,
  children,
  defaultOpen = true,
  actions,
  className,
}: SectionCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className={cn('bg-surface shadow-card rounded-lg p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-primary/8 flex items-center justify-center text-primary">
            {icon}
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-on-surface leading-tight">{title}</h2>
            {subtitle && <p className="text-[11px] text-on-surface-variant mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface px-2 py-1 rounded hover:bg-surface-container"
          >
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {open ? '折叠' : '展开'}
          </button>
        </div>
      </div>
      {open && <div>{children}</div>}
    </section>
  );
}

/** 表单字段标签（必填星号） */
export function FieldLabel({
  children,
  required,
  htmlFor,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-[12px] font-medium text-on-surface mb-1.5 flex items-center gap-1">
      {children}
      {required && <span className="text-error">*</span>}
      {hint && <span className="text-on-surface-variant/70 font-normal ml-1">· {hint}</span>}
    </label>
  );
}

/** 统一输入框样式（Tonal Fill） */
export const fieldInputClass =
  'flex h-9 w-full rounded-md bg-surface-container px-3 py-2 text-sm text-on-surface border-none outline-none transition-shadow placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/30 hover:bg-surface-container-high disabled:opacity-60';

export const fieldTextareaClass =
  'flex w-full rounded-md bg-surface-container px-3 py-2 text-sm text-on-surface border-none outline-none transition-shadow placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/30 hover:bg-surface-container-high resize-y';
