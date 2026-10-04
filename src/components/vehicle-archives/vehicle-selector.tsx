'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/lib/org';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Loader2, Check, Car } from 'lucide-react';

interface VehicleSummary {
  id: string;
  vin: string | null;
  plate_number: string | null;
  brand_model: string | null;
  custom_model_name: string | null;
  model_remark: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  fuel_type: string | null;
  registration_date: string | null;
}

export interface VehicleSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (vehicle: VehicleSummary) => void;
  /** 是否允许选择多个 */
  multiple?: boolean;
  /** 已选中的车辆 ID 列表（排除已选） */
  excludeIds?: string[];
  /** 已选中的多辆车回调 */
  onSelectMultiple?: (vehicles: VehicleSummary[]) => void;
}

export function VehicleSelector({
  open,
  onOpenChange,
  onSelect,
  multiple = false,
  excludeIds = [],
  onSelectMultiple,
}: VehicleSelectorProps) {
  const { organization } = useOrg();

  const [search, setSearch] = useState('');
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<VehicleSummary[]>([]);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (search) params.set('q', search);
      if (organization?.id) params.set('organization_id', organization.id);

      const res = await fetch(`/api/car-inventory/search?${params.toString()}`);
      const json = await res.json();
      setVehicles((json.data ?? []).filter((v: VehicleSummary) => !excludeIds.includes(v.id)));
    } catch (err) {
      console.error('搜索车辆失败:', err);
    } finally {
      setLoading(false);
    }
  }, [search, organization, excludeIds]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelected([]);
      fetchVehicles();
    }
  }, [open, fetchVehicles]);

  const handleToggle = (v: VehicleSummary) => {
    if (!multiple) {
      onSelect(v);
      onOpenChange(false);
      return;
    }
    setSelected((prev) =>
      prev.find((s) => s.id === v.id)
        ? prev.filter((s) => s.id !== v.id)
        : [...prev, v]
    );
  };

  const handleConfirmMultiple = () => {
    if (onSelectMultiple && selected.length > 0) {
      onSelectMultiple(selected);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>选择车辆</DialogTitle>
          <DialogDescription>
            从车辆档案中选择已保存的车辆
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索 VIN / 车牌 / 车型名 / 车型备注..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchVehicles()}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto -mx-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Car className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">暂无匹配车辆</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {multiple && <TableHead className="w-[40px]"></TableHead>}
                  <TableHead>VIN</TableHead>
                  <TableHead>车牌</TableHead>
                  <TableHead>品牌型号</TableHead>
                  <TableHead>备注名</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => {
                  const isSelected = multiple && selected.some((s) => s.id === v.id);
                  return (
                    <TableRow
                      key={v.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleToggle(v)}
                    >
                      {multiple && (
                        <TableCell>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-xs">{v.vin ?? '—'}</TableCell>
                      <TableCell>{v.plate_number ?? '—'}</TableCell>
                      <TableCell className="text-sm">{(v.brand_model || ((v.brand ?? '') + ' ' + (v.model ?? '')).trim()) || '—'}</TableCell>
                      <TableCell>
                        {v.custom_model_name ? (
                          <Badge variant="secondary">{v.custom_model_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        {multiple && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">
              已选 {selected.length} 辆
            </span>
            <Button onClick={handleConfirmMultiple} disabled={selected.length === 0}>
              确认选择
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}