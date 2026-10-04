"use client";

import { useEffect, useRef, useState } from "react";
import { Car, Package, Trash2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { searchVehicleArchives, type VinSuggestion } from "@/lib/vehicle-linkage/client";
import type { InvoiceItem } from "@/lib/proforma-invoice/helpers";

interface Props {
  item: InvoiceItem;
  index: number;
  /** 当前是否正在对该条目做 VIN 档案查询 */
  lookingUp: boolean;
  onChange: (index: number, field: keyof InvoiceItem, value: string | number) => void;
  onRemove: (index: number) => void;
  /** 从档案选中某个 VIN 后回调（由父级触发完整字段填充） */
  onSelectVin: (index: number, vin: string) => void;
}

export default function InvoiceItemCard({
  item,
  index,
  lookingUp,
  onChange,
  onRemove,
  onSelectVin,
}: Props) {
  const { token } = useAuth();
  const isVehicle = item.item_type === "vehicle";

  // ── VIN 档案检索（输入即搜，下拉候选）──
  const [suggestions, setSuggestions] = useState<VinSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedVin, setDebouncedVin] = useState("");
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 防抖：VIN 输入 300ms 后触发检索
  useEffect(() => {
    const t = setTimeout(() => setDebouncedVin(item.vin), 300);
    return () => clearTimeout(t);
  }, [item.vin]);

  useEffect(() => {
    let active = true;
    const q = debouncedVin.trim();
    if (q.length < 2 || !token) {
      setSuggestions([]);
      return;
    }
    searchVehicleArchives(token, q, 6)
      .then((list) => {
        if (active) setSuggestions(list);
      })
      .catch(() => {
        if (active) setSuggestions([]);
      });
    return () => {
      active = false;
    };
  }, [debouncedVin, token]);

  const handlePickSuggestion = (s: VinSuggestion) => {
    setShowSuggestions(false);
    setSuggestions([]);
    onSelectVin(index, s.vin);
  };

  return (
    <div className="p-4 border rounded-lg bg-muted/40 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={isVehicle ? "default" : "secondary"} className="gap-1">
            {isVehicle ? (
              <>
                <Car className="h-3 w-3" /> 车辆 {index + 1}
              </>
            ) : (
              <>
                <Package className="h-3 w-3" /> 产品 {index + 1}
              </>
            )}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRemove(index)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {isVehicle ? (
        <>
          {/* 品牌 / 型号 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>品牌 / Brand</Label>
              <Input
                value={item.brand}
                onChange={(e) => onChange(index, "brand", e.target.value)}
                placeholder="BYD"
              />
            </div>
            <div>
              <Label>型号 / Model</Label>
              <Input
                value={item.model}
                onChange={(e) => onChange(index, "model", e.target.value)}
                placeholder="Han EV"
              />
            </div>
          </div>

          {/* VIN（可检索，与车型档案强绑定） */}
          <div>
            <Label>VIN 码（输入可检索车型档案）</Label>
            <div className="relative">
              <Input
                value={item.vin}
                onChange={(e) => onChange(index, "vin", e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  blurTimer.current = setTimeout(() => setShowSuggestions(false), 150);
                }}
                placeholder="输入 17 位车架号，可从档案带出车辆信息"
                className="font-mono pr-7"
              />
              {lookingUp ? (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                item.vin.length >= 2 && (
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/60" />
                )
              )}

              {/* 档案候选下拉 */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handlePickSuggestion(s);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-b-0"
                    >
                      <span className="font-mono block">{s.vin}</span>
                      <span className="text-muted-foreground text-xs">
                        {[s.brandModel || [s.brand, s.model].filter(Boolean).join(" "), s.plateNumber]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 车况 / 能源 / 车身 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>车况 / Condition</Label>
              <Select value={item.condition} onValueChange={(v) => onChange(index, "condition", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">全新 New</SelectItem>
                  <SelectItem value="Used">二手 Used</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>能源类型 / Energy</Label>
              <Select value={item.energy} onValueChange={(v) => onChange(index, "energy", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Battery Electric">纯电动 BEV</SelectItem>
                  <SelectItem value="Plug-in Hybrid">插电混动 PHEV</SelectItem>
                  <SelectItem value="Gasoline">汽油 Gasoline</SelectItem>
                  <SelectItem value="Diesel">柴油 Diesel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>车身类型 / Body</Label>
              <Select value={item.body} onValueChange={(v) => onChange(index, "body", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Passenger Vehicle">乘用车</SelectItem>
                  <SelectItem value="SUV">SUV</SelectItem>
                  <SelectItem value="Truck">卡车</SelectItem>
                  <SelectItem value="Bus">客车</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 数量 / 单价 / 净重 / 毛重 */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label>数量 / Qty</Label>
              <Input
                type="number"
                value={item.qty}
                onChange={(e) => onChange(index, "qty", parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label>单价 / Unit Price</Label>
              <Input
                value={item.price}
                onChange={(e) => onChange(index, "price", e.target.value)}
                placeholder="25000"
              />
            </div>
            <div>
              <Label>净重 (kg) / Net</Label>
              <Input value={item.net} onChange={(e) => onChange(index, "net", e.target.value)} />
            </div>
            <div>
              <Label>毛重 (kg) / Gross</Label>
              <Input value={item.gross} onChange={(e) => onChange(index, "gross", e.target.value)} />
            </div>
          </div>

          {/* 备注（车辆模式新增） */}
          <div>
            <Label>备注 / Remarks</Label>
            <Textarea
              value={item.remarks}
              onChange={(e) => onChange(index, "remarks", e.target.value)}
              rows={2}
              placeholder="如车况说明、配置、随车文件等"
            />
          </div>
        </>
      ) : (
        <>
          {/* 产品：自由输入，无需 VIN 等车辆信息 */}
          <div>
            <Label>品名 / Item Name</Label>
            <Input
              value={item.name}
              onChange={(e) => onChange(index, "name", e.target.value)}
              placeholder="例如：充电桩 / 车载配件 / 电池包"
            />
          </div>
          <div>
            <Label>规格描述 / Description</Label>
            <Textarea
              value={item.description}
              onChange={(e) => onChange(index, "description", e.target.value)}
              rows={2}
              placeholder="型号、规格、参数等自由描述"
            />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label>数量 / Qty</Label>
              <Input
                type="number"
                value={item.qty}
                onChange={(e) => onChange(index, "qty", parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label>单位 / Unit</Label>
              <Input
                value={item.unit}
                onChange={(e) => onChange(index, "unit", e.target.value)}
                placeholder="PCS / SET"
              />
            </div>
            <div>
              <Label>单价 / Unit Price</Label>
              <Input
                value={item.price}
                onChange={(e) => onChange(index, "price", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>备注 / Remarks</Label>
              <Input
                value={item.remarks}
                onChange={(e) => onChange(index, "remarks", e.target.value)}
                placeholder="选填"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
