"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  getTempProject,
  updateTempProject,
  deleteTempProject,
  updateTodoStatus,
  advanceStage,
  generateTodos,
  type TempProject,
  type CustomerRequirement,
  type ProjectTodo,
} from "@/lib/temp-project";
import { EXPORT_STAGES, getStageRoute, getStageNextAction } from "@/lib/stage-config";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Globe,
  Car,
  Hash,
  Coins,
  FileText,
  User,
  Building2,
  Pencil,
  Check,
  X,
  Trash2,
  Loader2,
  AlertTriangle,
  Search,
  Sparkles,
  ChevronRight,
  Ship,
  Anchor,
  Calculator,
  FileCheck,
  UserPlus,
  LayoutDashboard,
  Circle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Construction,
  CircleDot,
} from "lucide-react";

// ============================================================
// 工具函数
// ============================================================

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function requirementSummary(req: CustomerRequirement): string {
  const parts: string[] = [];
  if (req.customerName) parts.push(req.customerName);
  if (req.destinationCountry) parts.push(req.destinationCountry);
  return parts.join(" · ") || "未填写";
}

// ============================================================
// 主页面
// ============================================================

export default function TempProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<TempProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // 编辑模式
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<CustomerRequirement | null>(null);
  const [saving, setSaving] = useState(false);

  // 加载项目
  useEffect(() => {
    if (!projectId) return;
    const t = setTimeout(() => {
      const p = getTempProject(projectId);
      if (p) {
        setProject(p);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [projectId]);

  // 开始编辑
  const handleStartEdit = useCallback(() => {
    if (!project) return;
    setEditForm({ ...project.requirement });
    setEditing(true);
  }, [project]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditForm(null);
    setEditing(false);
  }, []);

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editForm || !projectId) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    const updated = updateTempProject(projectId, { requirement: editForm });
    if (updated) {
      // 需求变更后重新生成待办
      const newTodos = generateTodos(updated);
      const final = updateTempProject(projectId, { todos: newTodos, requirement: editForm });
      if (final) setProject(final);
    }
    setEditing(false);
    setEditForm(null);
    setSaving(false);
  }, [editForm, projectId]);

  // 删除项目
  const handleDelete = useCallback(() => {
    if (!projectId) return;
    if (!confirm("确定要删除这个临时出口项目吗？此操作不可撤销。")) return;
    deleteTempProject(projectId);
    router.push("/");
  }, [projectId, router]);

  // 更新编辑表单字段
  const updateEditField = (field: keyof CustomerRequirement, value: string | number) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // 切换待办状态
  const handleToggleTodo = useCallback(
    (todoId: string, currentStatus: string) => {
      if (!projectId) return;
      const newStatus = currentStatus === "completed" ? "pending" : "completed";
      const updated = updateTodoStatus(projectId, todoId, newStatus as ProjectTodo["status"]);
      if (updated) setProject(updated);
    },
    [projectId]
  );

  // 手动推进阶段
  const handleAdvanceStage = useCallback(() => {
    if (!projectId) return;
    const updated = advanceStage(projectId);
    if (updated) setProject(updated);
  }, [projectId]);

  // 阶段跳转
  const handleStageClick = useCallback(
    (stage: number) => {
      if (!project) return;
      const req = project.requirement;

      // 第1步：打开编辑模式
      if (stage === 1) {
        handleStartEdit();
        // 滚动到客户需求区域
        setTimeout(() => {
          const el = document.getElementById("requirement-section");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
        return;
      }

      const route = getStageRoute(stage, projectId, req);
      if (route) {
        router.push(route);
      }
    },
    [project, projectId, router, handleStartEdit]
  );

  const inputClass =
    "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  // ---------- 加载中 ----------
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-40 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  // ---------- 未找到项目 ----------
  if (notFound || !project) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="p-3 rounded-full bg-muted inline-flex mb-4">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">找不到该项目</h2>
        <p className="text-sm text-muted-foreground mb-6">
          这个临时出口项目可能已被删除，或项目 ID 不正确。
        </p>
        <Button onClick={() => router.push("/")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          返回工作台
        </Button>
      </div>
    );
  }

  const req = project.requirement;
  const todos = project.todos || [];
  const completedStages = project.completedStages || [];
  const activeTodos = todos.filter((t) => t.status !== "completed");
  const completedTodos = todos.filter((t) => t.status === "completed");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          返回工作台
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="gap-1.5 text-muted-foreground hover:text-red-600"
        >
          <Trash2 className="w-4 h-4" />
          删除项目
        </Button>
      </div>

      {/* 项目概览 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-navy" />
                {requirementSummary(req) || "临时出口项目"}
              </h1>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  创建于 {formatDateTime(project.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  更新于 {formatDateTime(project.updatedAt)}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {project.type === "temporary" ? "临时项目" : "正式项目"}
                </span>
                {project.type === "temporary" && (
                  <span className="text-muted-foreground">仅保存在当前设备</span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1.5 bg-navy hover:bg-navy-light text-white"
              onClick={() => {
                const route = getStageRoute(2, projectId, req);
                if (route) router.push(route);
              }}
            >
              <Car className="w-4 h-4" />
              开始匹配车源
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">ID: {project.id}</p>
        </CardContent>
      </Card>

      {/* 客户需求 */}
      <Card id="requirement-section">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-navy" />
              客户需求
            </h2>
            {!editing && (
              <Button variant="ghost" size="sm" onClick={handleStartEdit} className="gap-1.5 text-muted-foreground">
                <Pencil className="w-3.5 h-3.5" />
                编辑
              </Button>
            )}
          </div>

          {editing && editForm ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">客户 / 买家</Label>
                <Input
                  value={editForm.customerName}
                  onChange={(e) => updateEditField("customerName", e.target.value)}
                  className={inputClass}
                  placeholder="公司名称"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">联系人</Label>
                  <Input
                    value={editForm.contactName || ""}
                    onChange={(e) => updateEditField("contactName", e.target.value)}
                    className={inputClass}
                    placeholder="联系人姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">联系电话</Label>
                  <Input
                    value={editForm.contactPhone || ""}
                    onChange={(e) => updateEditField("contactPhone", e.target.value)}
                    className={inputClass}
                    placeholder="联系电话"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  目的国家或地区
                </Label>
                <Input
                  value={editForm.destinationCountry}
                  onChange={(e) => updateEditField("destinationCountry", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />
                  车辆要求
                </Label>
                <Textarea
                  value={editForm.vehicleRequirements}
                  onChange={(e) => updateEditField("vehicleRequirements", e.target.value)}
                  className="min-h-[80px] resize-none"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">数量</Label>
                  <Input
                    type="number"
                    value={editForm.quantity || ""}
                    onChange={(e) => updateEditField("quantity", e.target.value === "" ? "" : Number(e.target.value))}
                    className={inputClass}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">预算范围</Label>
                  <Input
                    value={editForm.budgetRange}
                    onChange={(e) => updateEditField("budgetRange", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">期望交付时间</Label>
                <Input
                  value={editForm.expectedDelivery}
                  onChange={(e) => updateEditField("expectedDelivery", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">其他要求</Label>
                <Textarea
                  value={editForm.otherRequirements}
                  onChange={(e) => updateEditField("otherRequirements", e.target.value)}
                  className="min-h-[60px] resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving} className="gap-1.5">
                  <X className="w-4 h-4" />
                  取消
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <DetailRow icon={<Building2 className="w-4 h-4" />} label="客户 / 买家" value={req.customerName || "—"} />
              <DetailRow icon={<Globe className="w-4 h-4" />} label="目的国家或地区" value={req.destinationCountry || "—"} />
              <DetailRow icon={<User className="w-4 h-4" />} label="联系人" value={req.contactName || "—"} />
              <DetailRow icon={<Hash className="w-4 h-4" />} label="数量" value={req.quantity ? `${req.quantity} 辆` : "—"} />
              <DetailRow icon={<Car className="w-4 h-4" />} label="车辆要求" value={req.vehicleRequirements || "—"} />
              <DetailRow icon={<Coins className="w-4 h-4" />} label="预算范围" value={req.budgetRange || "—"} />
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="期望交付" value={req.expectedDelivery || "—"} />
              <DetailRow icon={<FileText className="w-4 h-4" />} label="其他要求" value={req.otherRequirements || "—"} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 标准出口流程 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-navy" />
            标准出口流程
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            {EXPORT_STAGES.map((stage, i) => {
              const stageNum = i + 1;
              const isCompleted = completedStages.includes(stageNum);
              const isCurrent = stageNum === project.currentStage;
              const isPending = !isCompleted && !isCurrent;
              const hasRoute = !!getStageRoute(stageNum, projectId, req);
              const isClickable = hasRoute || stageNum === 1;

              // 阶段图标映射
              const iconMap: Record<string, typeof Circle> = {
                UserPlus, Search, Calculator, FileCheck, Car, FileText, Anchor, Ship,
              };
              const StageIcon = iconMap[stage.icon] || Circle;

              return (
                <div key={stage.label} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!isClickable}
                    onClick={() => isClickable && handleStageClick(stageNum)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && isClickable) {
                        e.preventDefault();
                        handleStageClick(stageNum);
                      }
                    }}
                    className={`
                      group flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                      ${isCompleted
                        ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400 cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/60"
                        : isCurrent
                          ? "border-navy bg-navy/[0.08] text-navy font-medium cursor-default"
                          : isClickable
                            ? "border-border bg-card text-muted-foreground cursor-pointer hover:border-navy/30 hover:text-foreground hover:shadow-sm active:scale-[0.97]"
                            : "border-border bg-muted/30 text-muted-foreground/60 cursor-not-allowed"
                      }
                    `}
                    aria-label={`${stage.label}${isCompleted ? "（已完成）" : isCurrent ? "（进行中）" : isPending && !isClickable ? "（功能建设中）" : "（未开始）"}`}
                    title={!isClickable && !isCompleted && !isCurrent ? "功能建设中" : stage.label}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : isCurrent ? (
                      <CircleDot className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{stage.label}</span>
                    {isCompleted && (
                      <span className="text-[10px] text-green-600 dark:text-green-400 font-medium hidden sm:inline">
                        已完成
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] text-navy font-medium hidden sm:inline">
                        进行中
                      </span>
                    )}
                    {!isClickable && !isCompleted && !isCurrent && (
                      <Construction className="w-3 h-3 text-muted-foreground/40" />
                    )}
                  </button>
                  {i < EXPORT_STAGES.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
          {/* 推进阶段按钮 */}
          {project.currentStage < EXPORT_STAGES.length && (
            <div className="mt-4 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdvanceStage}
                className="gap-1.5 text-xs"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                标记当前阶段完成，推进到下一阶段
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 工作待办 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-navy" />
            工作待办
            {activeTodos.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy/10 text-navy font-medium">
                {activeTodos.length} 项待处理
              </span>
            )}
            {completedTodos.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                {completedTodos.length} 项已完成
              </span>
            )}
          </h2>

          {todos.length === 0 ? (
            <div className="text-center py-6">
              <Circle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                暂无待办事项。完善客户需求信息后，系统将自动生成标准待办清单。
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* 进行中 + 待处理 */}
              {activeTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  projectId={projectId}
                  req={req}
                  onToggle={handleToggleTodo}
                  router={router}
                />
              ))}
              {/* 已完成 */}
              {completedTodos.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <p className="text-[10px] text-muted-foreground px-1 mb-1">已完成</p>
                  {completedTodos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      projectId={projectId}
                      req={req}
                      onToggle={handleToggleTodo}
                      router={router}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 项目车辆 / 候选车源 */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Car className="w-4 h-4 text-navy" />
            项目车辆
          </h2>
          <p className="text-sm text-muted-foreground">还没有添加项目车辆。</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={() => {
              const route = getStageRoute(2, projectId, req);
              if (route) router.push(route);
            }}
          >
            <Search className="w-4 h-4" />
            从选车工作台匹配车源
          </Button>
        </CardContent>
      </Card>

      {/* 项目结果（占位） */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">项目结果</h2>
          <p className="text-sm text-muted-foreground">
            还没有项目结果。使用工具生成单证、报价等资料后，可将结果归入此项目。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 辅助组件
// ============================================================

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

// ============================================================
// 待办项组件
// ============================================================

function TodoItem({
  todo,
  projectId,
  req,
  onToggle,
  router,
}: {
  todo: ProjectTodo;
  projectId: string;
  req: CustomerRequirement;
  onToggle: (todoId: string, status: string) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const isCompleted = todo.status === "completed";
  const stageLabel = EXPORT_STAGES[todo.stage - 1]?.label || `阶段${todo.stage}`;

  return (
    <div
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors
        ${isCompleted
          ? "border-green-100 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/20"
          : todo.status === "in_progress"
            ? "border-navy/20 bg-navy/[0.03]"
            : "border-border bg-card hover:bg-muted/30"
        }
      `}
    >
      {/* 复选框 */}
      <button
        type="button"
        onClick={() => onToggle(todo.id, todo.status)}
        className={`
          shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          ${isCompleted
            ? "border-green-500 bg-green-500 text-white"
            : "border-muted-foreground/30 hover:border-navy"
          }
        `}
        aria-label={isCompleted ? "标记为待处理" : "标记为已完成"}
      >
        {isCompleted && <Check className="w-3 h-3" />}
      </button>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm truncate ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}
        >
          {todo.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{stageLabel}</span>
          {todo.status === "in_progress" && (
            <span className="text-[10px] px-1 py-px rounded bg-navy/10 text-navy font-medium">
              进行中
            </span>
          )}
        </div>
      </div>

      {/* 操作入口 */}
      {todo.actionRoute && !isCompleted && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => router.push(todo.actionRoute!)}
        >
          前往
          <ExternalLink className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}