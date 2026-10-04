'use client';

import * as React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { CustomsCodeItem } from '@/lib/customs-codes';

export interface CodeSelectProps {
  /** 全部候选代码项 */
  options: CustomsCodeItem[];
  /** 当前选中的 code */
  value: string;
  /** 选中回调，同时返回 code 和 name */
  onChange: (code: string, item?: CustomsCodeItem) => void;
  /** 占位符 */
  placeholder?: string;
  /** 搜索框占位符 */
  searchPlaceholder?: string;
  /** 触发器宽度 class，默认 w-full */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否允许清空 */
  clearable?: boolean;
  /** 空值时显示的占位符文本 */
  emptyLabel?: string;
  /** 是否显示代码，默认 true */
  showCode?: boolean;
  /** 弹窗宽度，默认 trigger 宽度（inline min-w 控制） */
  contentWidth?: number;
}

/**
 * 可搜索的海关代码下拉组件。
 *
 * 体验目标：
 * - 触发器是 bg-surface-container 的 Tonal Fill 输入框，聚焦 ring 反馈
 * - 弹出层支持代码 / 名称 / alias(拼音) 模糊搜索
 * - 选中后显示 "code - name"，同时通过 onChange 把 code 和完整 item 回传
 * - 适配报关单中大量"编码字段"，高度紧凑
 */
export const CodeSelect = React.forwardRef<HTMLButtonElement, CodeSelectProps>(function CodeSelect(
  {
    options,
    value,
    onChange,
    placeholder = '请选择',
    searchPlaceholder = '输入代码或名称搜索…',
    className,
    disabled,
    clearable = false,
    emptyLabel = '未找到匹配项',
    showCode = true,
    contentWidth,
  },
  ref,
) {
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(
    () => options.find((opt) => opt.code === value),
    [options, value],
  );

  const displayLabel = selected
    ? showCode
      ? `${selected.code} - ${selected.name}`
      : selected.name
    : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md bg-surface-container px-3 py-2',
            'text-left text-sm text-on-surface',
            'border-none outline-none transition-shadow',
            'focus-visible:ring-2 focus-visible:ring-primary/30',
            'hover:enabled:bg-surface-container-high',
            'data-[placeholder]:text-on-surface-variant/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span
            className={cn(
              'flex-1 truncate',
              !selected && 'text-on-surface-variant/50',
            )}
          >
            {displayLabel || placeholder}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-on-surface-variant/60 transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('p-0')}
        style={contentWidth ? { width: contentWidth } : undefined}
        align="start"
        sideOffset={4}
        avoidCollisions
      >
        <Command
          className="overflow-hidden rounded-md bg-popover"
          filter={(value, search) => {
            // 同时按 code、name、alias 匹配（不区分大小写、去空格）
            if (!search) return 1;
            const kw = search.trim().toLowerCase();
            const item = options.find((o) => o.code === value);
            if (!item) return 0;
            const code = item.code.toLowerCase();
            const name = item.name.toLowerCase();
            const alias = (item.alias || '').toLowerCase().replace(/\s/g, '');
            const compactKw = kw.replace(/\s/g, '');
            if (code.startsWith(kw)) return 1;
            if (name.includes(kw)) return 1;
            if (alias.includes(compactKw)) return 1;
            return 0;
          }}
        >
          <div className="flex items-center border-b border-outline-variant/40 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-on-surface-variant/60" />
            <CommandInput
              placeholder={searchPlaceholder}
              className="h-9 border-0 bg-transparent p-0 text-sm focus:ring-0"
            />
          </div>
          <CommandList className="max-h-72 overflow-y-auto">
            <CommandEmpty className="py-6 text-center text-sm text-on-surface-variant">
              {emptyLabel}
            </CommandEmpty>
            <CommandGroup>
              {clearable && value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onChange('', undefined);
                    setOpen(false);
                  }}
                  className="text-sm text-on-surface-variant cursor-pointer"
                >
                  <span className="text-on-surface-variant/60">— 清空选择 —</span>
                </CommandItem>
              )}
              {options.map((opt) => {
                const isSelected = opt.code === value;
                return (
                  <CommandItem
                    key={opt.code}
                    value={opt.code}
                    onSelect={() => {
                      onChange(opt.code, opt);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isSelected ? 'text-primary opacity-100' : 'opacity-0',
                      )}
                    />
                    <span
                      className={cn(
                        'shrink-0 font-mono text-[12px] text-on-surface-variant',
                        isSelected && 'text-primary',
                      )}
                    >
                      {opt.code}
                    </span>
                    <span className="flex-1 truncate">{opt.name}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
