'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Car,
  MoreHorizontal,
  Archive,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  ExternalLink,
  Shield,
  Gauge,
  Battery,
  ChevronDown,
} from 'lucide-react';
import type { VehicleArchiveRecord } from '@/lib/car-inventory/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

const FUEL_OPTIONS = ['汽油', '柴油', '纯电动', '插电混动', '天然气', '其他'];
const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '在库' },
  { value: 'archived', label: '已归档' },
];

export default function CarInventoryPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { organization } = useOrg();

  // ─── State ─────────────────────────────────────────────────
  const [vehicles, setVehicles] = useState<VehicleArchiveRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fuelFilter, setFuelFilter] = useState('');

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<VehicleArchiveRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Hard delete dialog
  const [hardDeleteTarget, setHardDeleteTarget] = useState<VehicleArchiveRecord | null>(null);
  const [hardDeleting, setHardDeleting] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────
  const fetchVehicles = useCallback(async () => {
    if (!user || !token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(page * limit));
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (fuelFilter) params.set('fuel_type', fuelFilter);
      if (organization?.id) params.set('organization_id', organization.id);

      const res = await fetch(`/api/car-inventory?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setVehicles(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (err) {
      console.error('获取车辆列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, [user, token, page, limit, search, statusFilter, fuelFilter, organization]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleSearch = () => {
    setPage(0);
    setSearch(searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setFuelFilter('');
    setPage(0);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!token) {
      toast.error('请先登录');
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/car-inventory/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '归档失败');
      toast.success('已归档');
      setDeleteTarget(null);
      fetchVehicles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '归档失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteTarget) return;
    if (!token) {
      toast.error('请先登录');
      return;
    }
    setHardDeleting(true);
    try {
      const res = await fetch(`/api/car-inventory/${hardDeleteTarget.id}?hard=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '删除失败');
      toast.success('已删除');
      setHardDeleteTarget(null);
      fetchVehicles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    } finally {
      setHardDeleting(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────
  const hasFilters = search || statusFilter || fuelFilter;

  const statusBadge = (status: string) => {
    if (status === 'active') return <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">在库</Badge>;
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">已归档</Badge>;
  };

  const sourceBadge = (source: string) => {
    const map: Record<string, string> = {
      manual: '手动录入',
      ocr_license: '行驶证识别',
      ocr_cert: '绿本识别',
      ocr_both: '双证识别',
    };
    return <Badge variant="outline" className="text-xs">{map[source] ?? source}</Badge>;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">车辆档案/车辆检测</h1>
          <p className="text-sm text-muted-foreground mt-1">
            上传绿本/行驶证自动识别，一键发起车况检测
          </p>
        </div>
        <Button onClick={() => router.push('/car-inventory/new')}>
          <Plus className="w-4 h-4 mr-2" />
          新增车辆
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索 VIN / 车牌 / 车型名 / 品牌型号..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={fuelFilter} onValueChange={(v) => { setFuelFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="燃料类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                {FUEL_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="default" size="sm" onClick={handleSearch}>
              搜索
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="w-3 h-3 mr-1" />
                清除筛选
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Car className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">{hasFilters ? '没有匹配的车辆档案' : '暂无车辆档案'}</p>
              {!hasFilters && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push('/car-inventory/new')}>
                  <Plus className="w-3 h-3 mr-1" />
                  新增第一辆车
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>VIN</TableHead>
                    <TableHead>车牌号</TableHead>
                    <TableHead>车源地</TableHead>
                    <TableHead>车型备注名</TableHead>
                    <TableHead>品牌型号</TableHead>
                    <TableHead>燃料</TableHead>
                    <TableHead>注册日期</TableHead>
                    <TableHead>来源</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="w-[200px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map((v) => (
                    <TableRow
                      key={v.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/car-inventory/${v.id}`)}
                    >
                      <TableCell className="font-mono text-xs">{v.vin ?? '—'}</TableCell>
                      <TableCell>{v.plate_number ?? '—'}</TableCell>
                      <TableCell>{v.vehicle_origin ?? '—'}</TableCell>
                      <TableCell>
                        {v.custom_model_name ? (
                          <span className="font-medium">{v.custom_model_name}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{(v.brand_model ?? ((v.brand ?? '') + ' ' + (v.model ?? '')).trim()) || '—'}</TableCell>
                      <TableCell>{v.fuel_type ?? '—'}</TableCell>
                      <TableCell className="text-sm">{v.registration_date ?? '—'}</TableCell>
                      <TableCell>{sourceBadge(v.source)}</TableCell>
                      <TableCell>{statusBadge(v.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/car-inventory/${v.id}/edit`)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-7.5 px-2.5 text-xs font-medium bg-orange hover:bg-orange/90 text-white shadow-sm shadow-orange/20"
                              >
                                <Shield className="w-3 h-3 mr-1" />
                                检测
                                <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => router.push(`/car-inventory/${v.id}?inspect=insurance`)}>
                                <Shield className="w-4 h-4 mr-2" />
                                出险报告
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/car-inventory/${v.id}?inspect=mileage`)}>
                                <Gauge className="w-4 h-4 mr-2" />
                                里程报告
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/car-inventory/${v.id}?inspect=battery`)}>
                                <Battery className="w-4 h-4 mr-2" />
                                电池健康度
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTarget(v)}
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                归档
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setHardDeleteTarget(v)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">共 {total} 辆</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      上一页
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {page + 1} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认归档</DialogTitle>
            <DialogDescription>
              归档后该车辆档案将不再在列表中显示，但仍可在历史记录中查看。
              {deleteTarget?.vin && (
                <span className="block mt-2 font-mono text-foreground">VIN: {deleteTarget.vin}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              确认归档
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hard Delete Confirm Dialog */}
      <Dialog open={!!hardDeleteTarget} onOpenChange={() => setHardDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              确认删除
            </DialogTitle>
            <DialogDescription>
              <span className="text-destructive font-medium">此操作不可撤销！</span>删除后该车辆档案及其所有关联数据将被永久移除。
              {hardDeleteTarget?.vin && (
                <span className="block mt-2 font-mono text-foreground">VIN: {hardDeleteTarget.vin}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHardDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleHardDelete} disabled={hardDeleting}>
              {hardDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}