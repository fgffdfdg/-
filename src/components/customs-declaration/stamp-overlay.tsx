'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, Trash2, ImageIcon, Move } from 'lucide-react';
import { listSavedStamps, addSavedStamp, removeSavedStamp } from '@/lib/customs-declaration/stamp-storage';
import type { SavedStamp } from '@/lib/customs-declaration/stamp-storage';

export interface StampConfig {
  dataUrl: string;
  x: number; // % from left
  y: number; // % from bottom
  width: number; // px at 100%
  height: number;
}

interface Props {
  config: StampConfig | null;
  onChange: (config: StampConfig | null) => void;
  sheetRef: React.RefObject<HTMLDivElement | null>;
}

const DEFAULT_STAMP_WIDTH = 148;
const MIN_SIZE = 40;

export function StampOverlay({ config, onChange, sheetRef }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [savedStamps, setSavedStamps] = useState<SavedStamp[]>([]);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startConfig: StampConfig } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // ---- 上传新印章 ----
  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new window.Image();
        img.onload = () => {
          const aspect = img.naturalHeight / img.naturalWidth;
          const w = DEFAULT_STAMP_WIDTH;
          const h = Math.round(w * aspect);
          const newConfig: StampConfig = {
            dataUrl,
            x: config?.x ?? 48,
            y: config?.y ?? 0,
            width: w,
            height: h,
          };
          onChange(newConfig);
          // 自动保存到库
          const name = file.name.replace(/\.[^.]+$/, '');
          addSavedStamp(name, dataUrl, w, h);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [config, onChange],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  // ---- 从库中选择 ----
  const openPicker = () => {
    setSavedStamps(listSavedStamps());
    setShowPicker(true);
  };

  const pickStamp = (s: SavedStamp) => {
    onChange({
      dataUrl: s.dataUrl,
      x: config?.x ?? 48,
      y: config?.y ?? 0,
      width: s.width,
      height: s.height,
    });
    setShowPicker(false);
  };

  const deleteSaved = (id: string) => {
    removeSavedStamp(id);
    setSavedStamps((prev) => prev.filter((s) => s.id !== id));
  };

  // ---- 拖拽 ----
  const onPointerDown = (e: React.PointerEvent) => {
    if (!config || !sheetRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    const rect = sheetRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startConfig: { ...config },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragRef.current || !sheetRef.current) return;
    const rect = sheetRef.current.getBoundingClientRect();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const xPct = dragRef.current.startConfig.x + (dx / rect.width) * 100;
    // y is from bottom, so moving up = negative dy = y increases
    const yPct = dragRef.current.startConfig.y - (dy / rect.height) * 100;
    onChange({ ...config!, x: Math.max(0, Math.min(100, xPct)), y: Math.max(0, Math.min(100, yPct)) });
  };

  const onPointerUp = () => {
    setDragging(false);
    dragRef.current = null;
  };

  // ---- 缩放 ----
  const onResizeDown = (e: React.PointerEvent) => {
    if (!config || !sheetRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setResizing(true);
    const rect = sheetRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startConfig: { ...config },
    };
  };

  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizing || !dragRef.current || !sheetRef.current) return;
    const rect = sheetRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragRef.current.startX) / rect.width;
    const scale = dragRef.current.startConfig.width / (rect.width / 100);
    const newW = Math.max(MIN_SIZE, dragRef.current.startConfig.width + dx * 100 * scale);
    const aspect = dragRef.current.startConfig.height / dragRef.current.startConfig.width;
    onChange({ ...config!, width: Math.round(newW), height: Math.round(newW * aspect) });
  };

  const onResizeUp = () => {
    setResizing(false);
    dragRef.current = null;
  };

  // ---- 移除 ----
  const removeStamp = () => onChange(null);

  if (!config) {
    return (
      <div className="stamp-placeholder">
        <button
          type="button"
          className="stamp-upload-btn"
          onClick={openPicker}
          title="上传印章"
        >
          <Upload className="w-4 h-4" />
          <span className="text-[11px]">上传印章</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {showPicker && (
          <div className="stamp-picker-overlay" onClick={() => setShowPicker(false)}>
            <div className="stamp-picker" onClick={(e) => e.stopPropagation()}>
              <div className="stamp-picker-header">
                <h4>选择印章</h4>
                <button onClick={() => setShowPicker(false)} className="text-on-surface-variant hover:text-on-surface">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 上传新印章 */}
              <button
                className="stamp-picker-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                <span>上传新印章</span>
              </button>

              {/* 已保存的印章 */}
              {savedStamps.length === 0 ? (
                <p className="text-xs text-on-surface-variant text-center py-6">
                  还没有保存过的印章，上传后会自动保存
                </p>
              ) : (
                <div className="stamp-picker-list">
                  {savedStamps.map((s) => (
                    <div key={s.id} className="stamp-picker-item" onClick={() => pickStamp(s)}>
                      <img src={s.dataUrl} alt={s.name} className="stamp-picker-img" />
                      <span className="text-[11px] truncate">{s.name}</span>
                      <button
                        className="stamp-picker-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSaved(s.id);
                        }}
                        title="删除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <img
        ref={imgRef}
        src={config.dataUrl}
        alt="申报单位报关专用章"
        className={`stamp-overlay ${dragging ? 'stamp-dragging' : ''} ${resizing ? 'stamp-resizing' : ''}`}
        style={{
          left: `${config.x}%`,
          bottom: `${config.y}%`,
          width: `${config.width}px`,
          height: `${config.height}px`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        draggable={false}
      />
      {/* 缩放把手 */}
      <div
        className="stamp-resize-handle"
        style={{
          left: `${config.x}%`,
          bottom: `${config.y}%`,
          width: `${config.width}px`,
          height: `${config.height}px`,
        }}
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
      >
        <div className="stamp-resize-dot" />
      </div>
      {/* 移除/更换按钮 */}
      <div
        className="stamp-toolbar"
        style={{
          left: `${config.x}%`,
          bottom: `calc(${config.y}% + ${config.height}px + 4px)`,
        }}
      >
        <button type="button" onClick={openPicker} title="更换印章">
          <ImageIcon className="w-3 h-3" />
        </button>
        <button type="button" onClick={removeStamp} title="移除印章">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {showPicker && (
        <div className="stamp-picker-overlay" onClick={() => setShowPicker(false)}>
          <div className="stamp-picker" onClick={(e) => e.stopPropagation()}>
            <div className="stamp-picker-header">
              <h4>选择印章</h4>
              <button onClick={() => setShowPicker(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              className="stamp-picker-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              <span>上传新印章</span>
            </button>
            {savedStamps.length === 0 ? (
              <p className="text-xs text-on-surface-variant text-center py-6">
                还没有保存过的印章，上传后会自动保存
              </p>
            ) : (
              <div className="stamp-picker-list">
                {savedStamps.map((s) => (
                  <div key={s.id} className="stamp-picker-item" onClick={() => pickStamp(s)}>
                    <img src={s.dataUrl} alt={s.name} className="stamp-picker-img" />
                    <span className="text-[11px] truncate">{s.name}</span>
                    <button
                      className="stamp-picker-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSaved(s.id);
                      }}
                      title="删除"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}