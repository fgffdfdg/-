"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Plus, Trash2, ExternalLink, FileText, Upload, X, Loader2,
  Car, Image, File, Eye, ChevronDown, ChevronUp, AlertCircle,
  ArrowRightLeft, CheckCircle2, XCircle, ClipboardList, Images
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { VehicleArchiveSummary } from "@/lib/car-inventory/types";
import type {
  ExportPendingTransfer,
  AttachmentRecord,
  AttachmentCategory,
} from "@/lib/export-pending-transfer/types";
import { ATTACHMENT_CATEGORY_LABELS } from "@/lib/export-pending-transfer/types";

const STATUS_CONFIG = {
  pending: { label: "待转移", color: "bg-amber-100 text-amber-800 border-amber-200", icon: ClipboardList },
  transferred: { label: "已转移", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-600 border-gray-200", icon: XCircle },
};

const CATEGORY_ICONS: Record<AttachmentCategory, React.ElementType> = {
  green_book: FileText,
  driving_license: FileText,
  invoice: File,
  temp_plate: File,
};

type AttachmentDropZoneProps = {
  record: ExportPendingTransfer;
  category: AttachmentCategory;
  attachments: AttachmentRecord[];
  CategoryIcon: React.ElementType;
  isUploading: boolean;
  onUpload: (recordId: string, category: AttachmentCategory, file: File) => void;
  onPreview: (recordId: string, att: AttachmentRecord) => void;
  onDelete: (recordId: string, attId: string) => void;
  deletingAttId: string | null;
};

function AttachmentDropZone({
  record,
  category,
  attachments,
  CategoryIcon,
  isUploading,
  onUpload,
  onPreview,
  onDelete,
  deletingAttId,
}: AttachmentDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = (file: File) => {
    onUpload(record.id, category, file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {ATTACHMENT_CATEGORY_LABELS[category]}
          </span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {attachments.length}
          </Badge>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg transition-all cursor-pointer
          ${isDragOver
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border/50 hover:border-muted-foreground/30 hover:bg-muted/20"
          }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = "";
          }}
          disabled={isUploading}
        />
        <div className="flex flex-col items-center justify-center py-3 px-2">
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mb-1" />
              <span className="text-[11px] text-muted-foreground">上传中...</span>
            </>
          ) : isDragOver ? (
            <>
              <Upload className="h-5 w-5 text-primary mb-1" />
              <span className="text-[11px] text-primary font-medium">释放文件以上传</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 text-muted-foreground/50 mb-0.5" />
              <span className="text-[11px] text-muted-foreground">拖拽文件或点击上传</span>
              <span className="text-[10px] text-muted-foreground/40 mt-0.5">支持图片、PDF</span>
            </>
          )}
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/50 border border-border/50 hover:bg-muted/80 transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {att.fileMime.startsWith("image/") ? (
                  <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-xs text-foreground truncate">{att.fileName}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {(att.fileSize / 1024).toFixed(0)}KB
                </span>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onPreview(record.id, att)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDelete(record.id, att.id)}
                  disabled={deletingAttId === att.id}
                >
                  {deletingAttId === att.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3 text-destructive/70" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExportPendingTransferPage() {
  const { user, token } = useAuth();

  // Helper to build auth headers
  const authHeaders = (): Record<string, string> => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  const [records, setRecords] = useState<ExportPendingTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [total, setTotal] = useState(0);

  // 新建对话框
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleResults, setVehicleResults] = useState<VehicleArchiveSummary[]>([]);
  const [searchingVehicles, setSearchingVehicles] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleArchiveSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [createNote, setCreateNote] = useState("");
  const [createError, setCreateError] = useState("");

  // 详情/编辑对话框
  const [detailRecord, setDetailRecord] = useState<ExportPendingTransfer | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<AttachmentCategory | null>(null);
  const [deletingAttId, setDeletingAttId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // 删除确认
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingRecord, setDeletingRecord] = useState(false);

  // 展开的记录 ID 集合
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const isLoggedIn = !!user;

  const fetchRecords = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "50");

      const res = await fetch(`/api/export-pending-transfer?${params.toString()}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setRecords(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error("加载列表失败:", err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, statusFilter, searchQuery]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 搜索车辆
  const searchVehicles = async (q: string) => {
    if (q.length < 1) {
      setVehicleResults([]);
      return;
    }
    setSearchingVehicles(true);
    try {
      const res = await fetch(`/api/car-inventory/search?q=${encodeURIComponent(q)}&limit=10`, { headers: authHeaders() });
      if (!res.ok) throw new Error("搜索失败");
      const data = await res.json();
      let results = (data.data ?? []) as VehicleArchiveSummary[];
      // 非完整17位VIN搜索时，过滤掉已纳入出口待转移名单的车辆
      const isFullVin = /^[A-HJ-NPR-Z0-9]{17}$/i.test(q.trim());
      if (!isFullVin) {
        const existingIds = new Set(records.filter(r => r.vehicle?.id).map(r => r.vehicle!.id));
        results = results.filter(v => !existingIds.has(v.id));
      }
      setVehicleResults(results);
    } catch (err) {
      console.error("搜索车辆失败:", err);
    } finally {
      setSearchingVehicles(false);
    }
  };

  // 创建记录
  const handleCreate = async () => {
    if (!selectedVehicle) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/export-pending-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          vehicleArchiveId: selectedVehicle.id,
          notes: createNote || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error ?? "创建失败");
        return;
      }
      setShowCreateDialog(false);
      setSelectedVehicle(null);
      setVehicleSearch("");
      setVehicleResults([]);
      setCreateNote("");
      setCreateError("");
      fetchRecords();
    } catch (err) {
      setCreateError("创建失败，请重试");
    } finally {
      setCreating(false);
    }
  };

  // 获取附件签名 URL
  const getAttachmentUrl = async (recordId: string, attachmentId: string): Promise<string | null> => {
    try {
      const res = await fetch(`/api/export-pending-transfer/${recordId}/attachments/${attachmentId}/file-url`, { headers: authHeaders() });
      if (!res.ok) return null;
      const data = await res.json();
      return data.url ?? null;
    } catch {
      return null;
    }
  };

  // 预览附件
  const handlePreview = async (recordId: string, att: AttachmentRecord) => {
    setPreviewUrl(null);
    setPreviewFileName(att.fileName);
    const url = await getAttachmentUrl(recordId, att.id);
    if (url) {
      setPreviewUrl(url);
    }
  };

  // 上传附件
  const handleUpload = async (recordId: string, category: AttachmentCategory, file: File) => {
    setUploadingCategory(category);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const res = await fetch(`/api/export-pending-transfer/${recordId}/attachments`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "上传失败");
        return;
      }
      fetchRecords();
      // 刷新详情
      if (detailRecord?.id === recordId) {
        refreshDetail(recordId);
      }
    } catch (err) {
      console.error("上传失败:", err);
      alert("上传失败，请重试");
    } finally {
      setUploadingCategory(null);
    }
  };

  // 删除附件
  const handleDeleteAttachment = async (recordId: string, attachmentId: string) => {
    setDeletingAttId(attachmentId);
    try {
      const res = await fetch(`/api/export-pending-transfer/${recordId}/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        alert("删除失败");
        return;
      }
      fetchRecords();
      if (detailRecord?.id === recordId) {
        refreshDetail(recordId);
      }
    } catch (err) {
      console.error("删除附件失败:", err);
    } finally {
      setDeletingAttId(null);
    }
  };

  // 刷新详情
  const refreshDetail = async (recordId: string) => {
    try {
      const res = await fetch(`/api/export-pending-transfer/${recordId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDetailRecord(data);
      }
    } catch (err) {
      console.error("刷新详情失败:", err);
    }
  };

  // 打开详情
  const openDetail = async (record: ExportPendingTransfer) => {
    setDetailRecord(record);
    setShowDetailDialog(true);
    refreshDetail(record.id);
  };

  // 更新状态
  const handleStatusChange = async (recordId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/export-pending-transfer/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        alert("更新状态失败");
        return;
      }
      fetchRecords();
      if (detailRecord?.id === recordId) {
        refreshDetail(recordId);
      }
    } catch (err) {
      console.error("更新状态失败:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 删除记录
  const handleDeleteRecord = async (recordId: string) => {
    setDeletingRecord(true);
    try {
      const res = await fetch(`/api/export-pending-transfer/${recordId}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) {
        alert("删除失败");
        return;
      }
      setDeleteConfirmId(null);
      setShowDetailDialog(false);
      setDetailRecord(null);
      fetchRecords();
    } catch (err) {
      console.error("删除失败:", err);
    } finally {
      setDeletingRecord(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getAttachmentsByCategory = (record: ExportPendingTransfer, category: AttachmentCategory): AttachmentRecord[] => {
    switch (category) {
      case "green_book": return record.greenBookKeys ?? [];
      case "driving_license": return record.drivingLicenseKeys ?? [];
      case "invoice": return record.invoiceKeys ?? [];
      case "temp_plate": return record.tempPlateKeys ?? [];
    }
  };

  const getVehicleDisplay = (record: ExportPendingTransfer) => {
    const v = record.vehicle;
    if (!v) return "未知车辆";
    const parts: string[] = [];
    if (v.plateNumber) parts.push(v.plateNumber);
    if (v.vin) parts.push(v.vin);
    if (v.modelRemark) parts.push(v.modelRemark);
    else if (v.brandModel || v.customModelName) parts.push(v.brandModel ?? v.customModelName ?? "");
    return parts.join(" · ") || "未知车辆";
  };

  // 渲染附件区域
  const renderAttachmentSection = (
    record: ExportPendingTransfer,
    category: AttachmentCategory,
  ) => {
    const attachments = getAttachmentsByCategory(record, category);
    const CategoryIcon = CATEGORY_ICONS[category];

    return (
      <AttachmentDropZone
        record={record}
        category={category}
        attachments={attachments}
        CategoryIcon={CategoryIcon}
        isUploading={uploadingCategory === category}
        onUpload={handleUpload}
        onPreview={handlePreview}
        onDelete={handleDeleteAttachment}
        deletingAttId={deletingAttId}
      />
    );
  };

  if (!isLoggedIn) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">出口待转移</h1>
          <p className="text-muted-foreground">管理待转移出口车辆，跟踪转移进度与归档附件</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">请先登录</p>
                  <p className="text-xs text-muted-foreground">登录后可使用出口待转移管理功能</p>
                </div>
              </div>
              <Button onClick={() => (window.location.href = "/login")}>去登录</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">出口待转移</h1>
          <p className="text-muted-foreground">管理待转移出口车辆，跟踪转移进度与归档附件</p>
        </div>
        <Button
          onClick={() => {
            setShowCreateDialog(true);
            setVehicleSearch("");
            setVehicleResults([]);
            setSelectedVehicle(null);
            setCreateNote("");
            setCreateError("");
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          新增待转移
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索 VIN / 车牌 / 车型 / 车型备注..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待转移</SelectItem>
            <SelectItem value="transferred">已转移</SelectItem>
            <SelectItem value="cancelled">已取消</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Records List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 pb-6">
            <div className="text-center text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>暂无出口待转移记录</p>
              <p className="text-sm mt-1">点击上方按钮，选择车源管理中的车辆开始跟踪</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const StatusIcon = STATUS_CONFIG[record.status]?.icon ?? ClipboardList;
            const isExpanded = expandedIds.has(record.id);
            const allCategories: AttachmentCategory[] = ["green_book", "driving_license", "invoice", "temp_plate"];

            return (
              <Card key={record.id} className="overflow-hidden">
                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                        <h3 className="font-semibold text-foreground truncate text-sm">
                          {getVehicleDisplay(record)}
                        </h3>
                      </div>
                      {record.vehicle && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {record.vehicle.color && <span>{record.vehicle.color}</span>}
                          {record.vehicle.fuelType && <span className="text-muted-foreground/60">|</span>}
                          {record.vehicle.fuelType && <span>{record.vehicle.fuelType}</span>}
                          {record.vehicle.registrationDate && <span className="text-muted-foreground/60">|</span>}
                          {record.vehicle.registrationDate && <span>登记: {record.vehicle.registrationDate}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`text-[11px] border ${STATUS_CONFIG[record.status]?.color ?? ""}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {STATUS_CONFIG[record.status]?.label ?? record.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleExpand(record.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Attachment Summary */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {allCategories.map((cat) => {
                      const count = getAttachmentsByCategory(record, cat).length;
                      const CatIcon = CATEGORY_ICONS[cat];
                      return (
                        <div key={cat} className="flex items-center gap-1">
                          <CatIcon className="h-3 w-3" />
                          <span>{count > 0 ? `${count}个文件` : "无"}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {allCategories.map((cat) => (
                          <div key={cat} className="p-2.5 rounded-lg bg-muted/30">
                            {renderAttachmentSection(record, cat)}
                          </div>
                        ))}
                      </div>
                      {record.notes && (
                        <div className="mt-3 p-2.5 rounded-lg bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">备注</p>
                          <p className="text-sm text-foreground">{record.notes}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        {record.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs"
                              onClick={() => handleStatusChange(record.id, "transferred")}
                              disabled={updatingStatus}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              标记已转移
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs"
                              onClick={() => handleStatusChange(record.id, "cancelled")}
                              disabled={updatingStatus}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              取消
                            </Button>
                          </>
                        )}
                        {record.status === "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs"
                            onClick={() => handleStatusChange(record.id, "pending")}
                            disabled={updatingStatus}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            恢复待转移
                          </Button>
                        )}
                        <div className="flex-1" />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 text-xs text-destructive/70 hover:text-destructive"
                          onClick={() => setDeleteConfirmId(record.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          删除
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
          <p className="text-xs text-muted-foreground text-center">共 {total} 条记录</p>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>新增出口待转移</DialogTitle>
            <DialogDescription>
              从车源管理中选择车辆，标记为出口待转移状态
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Vehicle Search */}
            <div className="space-y-2">
              <Label>搜索车辆</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="输入 VIN / 车牌 / 车型搜索..."
                  className="pl-9"
                  value={vehicleSearch}
                  onChange={(e) => {
                    setVehicleSearch(e.target.value);
                    searchVehicles(e.target.value);
                  }}
                />
              </div>
              {searchingVehicles && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  搜索中...
                </div>
              )}
              {vehicleResults.length > 0 && !selectedVehicle && (
                <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                  {vehicleResults.map((v) => (
                    <button
                      key={v.id}
                      className="w-full text-left p-3 hover:bg-muted/50 transition-colors flex items-center justify-between"
                      onClick={() => {
                        setSelectedVehicle(v);
                        setVehicleSearch(`${v.plateNumber ?? ""} ${v.vin ?? ""} ${v.modelRemark ?? v.brandModel ?? v.customModelName ?? ""}`.trim());
                        setVehicleResults([]);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {v.plateNumber || v.vin || "未知"}
                            {v.modelRemark && <span className="text-primary font-medium ml-1">— {v.modelRemark}</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[v.modelRemark ?? v.brandModel ?? v.customModelName, v.vin, v.color].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Vehicle */}
            {selectedVehicle && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {selectedVehicle.plateNumber || selectedVehicle.vin || "未知"}
                        {selectedVehicle.notes && <span className="text-muted-foreground font-normal ml-1">— {selectedVehicle.notes}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[selectedVehicle.brandModel ?? selectedVehicle.customModelName, selectedVehicle.vin, selectedVehicle.color]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setSelectedVehicle(null);
                      setVehicleSearch("");
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Note */}
            <div className="space-y-2">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="添加备注信息..."
                value={createNote}
                onChange={(e) => setCreateNote(e.target.value)}
                rows={2}
              />
            </div>

            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={!selectedVehicle || creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  创建中...
                </>
              ) : (
                "确认创建"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这条出口待转移记录吗？相关附件也会一并删除，此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteRecord(deleteConfirmId)}
              disabled={deletingRecord}
            >
              {deletingRecord ? "删除中..." : "删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewUrl !== null} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">{previewFileName}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[300px] bg-muted/30 rounded-lg">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-[70vh] rounded-lg"
                title={previewFileName}
              />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}