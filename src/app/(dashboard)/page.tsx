"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerRequirementDrawer } from "@/components/home/customer-requirement-drawer";
import {
  getTempProjects,
  onTempProjectsChange,
  type TempProject,
} from "@/lib/temp-project";
import {
  LayoutDashboard,
  Plus,
  ArrowRight,
  Car,
  FileText,
  Calculator,
  Ship,
  Search,
  Users,
  Anchor,
  Clock,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ChevronRight,
  Play,
  FileCheck,
  UserPlus,
  Sparkles,
  HardDrive,
  ExternalLink,
  Coins,
} from "lucide-react";

// ============================================================
// 类型定义
// ============================================================

interface TodoItem {
  id: string;
  title: string;
  projectName: string;
  owner: string;
  deadline: string;
  priority: "blocking" | "risk" | "attention";
  stage: string;
}

interface ProjectVehicle {
  stage: string;
  count: number;
}

interface ActiveProject {
  id: string;
  customerName: string;
  destinationCountry: string;
  vehicleCount: number;
  vehicleStages: ProjectVehicle[];
  nextAction: string;
  nextActionOwner: string;
  nextActionDeadline: string;
  hasAnomaly: boolean;
  anomalyCount: number;
  progressLabel: string;
}

interface HighFreqTool {
  name: string;
  description: string;
  path: string;
  icon: React.ReactNode;
}

interface StageItem {
  label: string;
  description: string;
  icon: React.ReactNode;
  toolPath?: string;
  toolLabel?: string;
  /** 是否打开客户需求抽屉（仅第1步） */
  opensDrawer?: boolean;
}

// ============================================================
// 模拟数据
// ============================================================

const mockTodos: TodoItem[] = [
  {
    id: "1",
    title: "缺少目的国清关授权书",
    projectName: "迪拜 - Al Fahim Group",
    owner: "张伟",
    deadline: "2025-08-25",
    priority: "blocking",
    stage: "单证与许可证",
  },
  {
    id: "2",
    title: "车辆 VIN WP1AA2A25MLA01234 排放检测报告未上传",
    projectName: "迪拜 - Al Fahim Group",
    owner: "李娜",
    deadline: "2025-08-26",
    priority: "blocking",
    stage: "车辆采购",
  },
  {
    id: "3",
    title: "海运订舱截止日期临近",
    projectName: "沙特 - Al Jomaih Auto",
    owner: "王磊",
    deadline: "2025-08-28",
    priority: "risk",
    stage: "物流",
  },
  {
    id: "4",
    title: "汇率波动可能影响报价利润",
    projectName: "约旦 - Marka Trading",
    owner: "张伟",
    deadline: "2025-08-30",
    priority: "risk",
    stage: "报价与成交",
  },
  {
    id: "5",
    title: "装箱单需要更新车辆规格",
    projectName: "迪拜 - Al Fahim Group",
    owner: "李娜",
    deadline: "2025-08-25",
    priority: "attention",
    stage: "单证与许可证",
  },
  {
    id: "6",
    title: "确认客户付款方式",
    projectName: "沙特 - Al Jomaih Auto",
    owner: "王磊",
    deadline: "2025-08-27",
    priority: "attention",
    stage: "报价与成交",
  },
  {
    id: "7",
    title: "整理报关资料",
    projectName: "伊拉克 - Babylon Motors",
    owner: "张伟",
    deadline: "2025-08-29",
    priority: "attention",
    stage: "报关",
  },
];

const mockProjects: ActiveProject[] = [
  {
    id: "proj-1",
    customerName: "Al Fahim Group",
    destinationCountry: "阿联酋·迪拜",
    vehicleCount: 8,
    vehicleStages: [
      { stage: "采购", count: 2 },
      { stage: "单证", count: 5 },
      { stage: "运输", count: 1 },
    ],
    nextAction: "提交出口许可证申请",
    nextActionOwner: "张伟",
    nextActionDeadline: "2025-08-25",
    hasAnomaly: true,
    anomalyCount: 3,
    progressLabel: "单证阶段",
  },
  {
    id: "proj-2",
    customerName: "Al Jomaih Auto",
    destinationCountry: "沙特·利雅得",
    vehicleCount: 4,
    vehicleStages: [
      { stage: "采购", count: 1 },
      { stage: "报关", count: 3 },
    ],
    nextAction: "确认订舱信息",
    nextActionOwner: "王磊",
    nextActionDeadline: "2025-08-28",
    hasAnomaly: false,
    anomalyCount: 0,
    progressLabel: "报关阶段",
  },
  {
    id: "proj-3",
    customerName: "Marka Trading",
    destinationCountry: "约旦·安曼",
    vehicleCount: 2,
    vehicleStages: [
      { stage: "报价", count: 2 },
    ],
    nextAction: "发送形式发票",
    nextActionOwner: "张伟",
    nextActionDeadline: "2025-08-30",
    hasAnomaly: false,
    anomalyCount: 0,
    progressLabel: "报价阶段",
  },
  {
    id: "proj-4",
    customerName: "Babylon Motors",
    destinationCountry: "伊拉克·巴格达",
    vehicleCount: 6,
    vehicleStages: [
      { stage: "采购", count: 3 },
      { stage: "单证", count: 2 },
      { stage: "运输", count: 1 },
    ],
    nextAction: "整理报关资料",
    nextActionOwner: "张伟",
    nextActionDeadline: "2025-08-29",
    hasAnomaly: true,
    anomalyCount: 1,
    progressLabel: "单证阶段",
  },
];

const highFreqTools: HighFreqTool[] = [
  {
    name: "配置查询",
    description: "VIN 码查询车辆详细配置",
    path: "/vin-lookup",
    icon: <Search className="w-5 h-5" />,
  },
  {
    name: "形式发票",
    description: "生成专业的形式发票文档",
    path: "/proforma-invoice",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    name: "报价计算器",
    description: "设计公式与报价计算",
    path: "/quote-calculator",
    icon: <Calculator className="w-5 h-5" />,
  },
  {
    name: "运输跟踪",
    description: "海运位置实时跟踪",
    path: "/tracking",
    icon: <Ship className="w-5 h-5" />,
  },
  {
    name: "客户管理",
    description: "管理海外买家信息",
    path: "/customers",
    icon: <Users className="w-5 h-5" />,
  },
];

const exportStages: StageItem[] = [
  {
    label: "客户需求",
    description: "记录客户需求与目标市场",
    icon: <UserPlus className="w-4 h-4" />,
    opensDrawer: true,
  },
  {
    label: "找车与验车",
    description: "匹配候选车源并完成车辆查验",
    icon: <Search className="w-4 h-4" />,
    toolPath: "/vehicle-sourcing",
    toolLabel: "选车工作台",
  },
  {
    label: "报价",
    description: "制作报价单与形式发票",
    icon: <Calculator className="w-4 h-4" />,
    toolPath: "/quote-calculator",
    toolLabel: "报价计算器",
  },
  {
    label: "签约",
    description: "签订出口合同",
    icon: <FileCheck className="w-4 h-4" />,
    toolPath: "/documents",
    toolLabel: "发票合同装箱单",
  },
  {
    label: "车辆采购",
    description: "采购车辆并归档资料",
    icon: <Car className="w-4 h-4" />,
    toolPath: "/procurement",
    toolLabel: "车辆采购",
  },
  {
    label: "单证与许可证",
    description: "准备出口所需单证",
    icon: <FileText className="w-4 h-4" />,
    toolPath: "/export-license",
    toolLabel: "出口许可证",
  },
  {
    label: "报关",
    description: "完成出口报关",
    icon: <Anchor className="w-4 h-4" />,
    toolPath: "/customs-declaration",
    toolLabel: "报关预录",
  },
  {
    label: "物流",
    description: "安排运输与跟踪",
    icon: <Ship className="w-4 h-4" />,
    toolPath: "/tracking",
    toolLabel: "运输跟踪",
  },
  {
    label: "结算归档",
    description: "完成结算与档案归档",
    icon: <FileCheck className="w-4 h-4" />,
    toolPath: "/my-records",
    toolLabel: "我的记录",
  },
];

// ============================================================
// 工具函数
// ============================================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${y}年${m}月${d}日 ${weekDays[date.getDay()]}`;
}

// ============================================================
// 共享子组件
// ============================================================

function PriorityBadge({ priority }: { priority: TodoItem["priority"] }) {
  const config = {
    blocking: { bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "阻断", icon: AlertTriangle },
    risk: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", label: "风险", icon: AlertCircle },
    attention: { bg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "关注", icon: Info },
  };
  const c = config[priority];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${c.bg}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function StageBar({ stages, total }: { stages: ProjectVehicle[]; total: number }) {
  const stageColors: Record<string, string> = {
    "客户需求": "bg-slate-300 dark:bg-slate-600",
    "找车": "bg-violet-400",
    "报价": "bg-blue-400",
    "签约": "bg-indigo-400",
    "采购": "bg-amber-400",
    "单证": "bg-orange-400",
    "报关": "bg-teal-400",
    "运输": "bg-sky-400",
    "结算": "bg-emerald-400",
  };

  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
      {stages.map((s) => (
        <div
          key={s.stage}
          className={`${stageColors[s.stage] || "bg-slate-400"} transition-all`}
          style={{ width: `${(s.count / total) * 100}%` }}
          title={`${s.stage}: ${s.count} 辆`}
        />
      ))}
    </div>
  );
}

/**
 * 临时出口项目卡片
 */
function TempProjectCard({ project, onOpenDrawer }: { project: TempProject; onOpenDrawer: () => void }) {
  const router = useRouter();
  const req = project.requirement;
  const summary = [req.customerName, req.destinationCountry].filter(Boolean).join(" · ") || "未命名项目";
  const stageLabel = project.currentStage === 1 ? "客户需求阶段" : `第 ${project.currentStage} 阶段`;
  const nextAction = project.currentStage === 1
    ? "匹配候选车源并完成车辆查验"
    : project.currentStage === 2
    ? "准备报价"
    : "查看项目详情";

  return (
    <Card className="hover:shadow-sm hover:border-navy/20 transition-all cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground text-sm truncate">{summary}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {req.vehicleRequirements || "暂无车辆需求"}
            </p>
          </div>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0 ml-2">
            {project.status === "draft" ? "草稿" : "进行中"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {req.quantity > 0 && (
            <span className="flex items-center gap-1">
              <Car className="w-3 h-3" />{req.quantity} 辆
            </span>
          )}
          {req.budgetRange && (
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3" />{req.budgetRange}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{stageLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground flex-1"
            onClick={() => router.push(`/projects/temp/${project.id}`)}
          >
            <ExternalLink className="w-3 h-3" />
            查看项目
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 text-navy hover:text-navy"
            onClick={() => {
              if (project.currentStage === 1) {
                router.push(`/vehicle-sourcing?projectId=${encodeURIComponent(project.id)}&country=${encodeURIComponent(req.destinationCountry)}&vehicleReq=${encodeURIComponent(req.vehicleRequirements)}`);
              } else {
                router.push(`/projects/temp/${project.id}`);
              }
            }}
          >
            {project.currentStage === 1 ? (
              <><Car className="w-3 h-3" />匹配车源</>
            ) : (
              <><ChevronRight className="w-3 h-3" />{nextAction}</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 临时出口项目区域
 */
function TempProjectsSection({
  projects,
  onOpenDrawer,
}: {
  projects: TempProject[];
  onOpenDrawer: () => void;
}) {
  const router = useRouter();
  const displayProjects = projects.slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-amber-500" />
          临时出口项目
          <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            仅保存在当前设备
          </span>
        </h2>
        {projects.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 text-muted-foreground"
            onClick={() => {
              // 滚动到项目区域或打开更多
              const el = document.getElementById("temp-projects-list");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            查看全部 ({projects.length}) <ChevronRight className="w-3 h-3" />
          </Button>
        )}
      </div>
      <div id="temp-projects-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayProjects.map((p) => (
          <TempProjectCard key={p.id} project={p} onOpenDrawer={onOpenDrawer} />
        ))}
        {/* 继续完善/新建 */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:border-navy/30 hover:bg-navy/[0.02] transition-all text-muted-foreground hover:text-navy min-h-[140px]"
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs font-medium">新建出口项目</span>
        </button>
      </div>
    </div>
  );
}

/**
 * 阶段卡片 —— 统一交互规范
 * - 第1步"客户需求"打开抽屉
 * - 其他步骤跳转到对应工具页
 * - hover / focus-visible / active / 键盘 Enter+Space
 */
function StageCard({
  stage,
  index,
  onOpenDrawer,
}: {
  stage: StageItem;
  index: number;
  onOpenDrawer: () => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (stage.opensDrawer) {
      onOpenDrawer();
    } else if (stage.toolPath) {
      router.push(stage.toolPath);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const isFirst = stage.opensDrawer;

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${stage.label}：${stage.description}${isFirst ? "，点击记录客户需求" : ""}`}
      className={`
        group relative flex flex-col items-center gap-1.5 p-3 rounded-xl
        bg-card border border-border
        hover:border-navy/40 hover:shadow-sm hover:bg-navy/[0.02]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-1 focus-visible:border-navy/40
        active:scale-[0.97] active:bg-navy/[0.04]
        transition-all duration-150 text-left cursor-pointer
        ${isFirst ? "border-navy/30 bg-navy/[0.02] hover:bg-navy/[0.05] shadow-sm" : ""}
      `}
    >
      {/* 序号 */}
      <span className={`
        absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full
        text-white text-[10px] font-bold flex items-center justify-center
        transition-transform group-hover:scale-110
        ${isFirst ? "bg-orange ring-2 ring-orange/20" : "bg-navy"}
      `}>
        {index + 1}
      </span>

      {/* 图标 */}
      <span className={`
        transition-colors
        ${isFirst ? "text-orange" : "text-muted-foreground group-hover:text-navy"}
      `}>
        {stage.icon}
      </span>

      {/* 标签 */}
      <span className="text-xs font-medium text-foreground text-center leading-tight">
        {stage.label}
      </span>

      {/* 描述 */}
      <span className="text-[10px] text-muted-foreground text-center leading-tight hidden sm:block">
        {stage.description}
      </span>

      {/* 工具提示 */}
      {stage.toolLabel && !isFirst && (
        <span className="text-[10px] text-navy/70 font-medium opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          {stage.toolLabel} →
        </span>
      )}

      {/* 第1步的特殊提示 */}
      {isFirst && (
        <span className="text-[10px] text-orange font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          点击开始
        </span>
      )}
    </button>
  );
}

// ============================================================
// 标准出口流程（共享组件）
// ============================================================

function ExportFlow({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
        标准出口流程
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {exportStages.map((stage, i) => (
          <StageCard
            key={stage.label}
            stage={stage}
            index={i}
            onOpenDrawer={onOpenDrawer}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// 匿名访问状态
// ============================================================

function AnonymousHome({
  onOpenDrawer,
  tempProjects,
}: {
  onOpenDrawer: () => void;
  tempProjects: TempProject[];
}) {
  const router = useRouter();
  const hasProjects = tempProjects.length > 0;

  const handleToolClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="space-y-6">
      {/* 主 CTA */}
      <Card className="border-navy/10 bg-card overflow-hidden">
        <CardContent className="p-6 lg:p-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">开始一项出口业务</h1>
          <p className="text-muted-foreground text-sm max-w-lg">
            从客户需求到结算归档，一站式管理二手车出口全流程。创建临时出口项目，逐步完善客户、车辆与单证信息。
          </p>
        </CardContent>
      </Card>

      {/* 临时出口项目 */}
      {hasProjects && <TempProjectsSection projects={tempProjects} onOpenDrawer={onOpenDrawer} />}

      {/* 标准出口流程 */}
      <ExportFlow onOpenDrawer={onOpenDrawer} />

      {/* 高频工具 */}
      <div id="high-freq-tools">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          高频工具
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {highFreqTools.map((tool) => (
            <Card
              key={tool.path}
              className="hover:shadow-sm hover:border-navy/30 transition-all cursor-pointer group"
              onClick={() => handleToolClick(tool.path)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="p-2.5 rounded-xl bg-navy/[0.06] text-navy group-hover:bg-navy group-hover:text-white transition-colors">
                  {tool.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">{tool.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{tool.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 未登录提示 */}
      <Card className="bg-navy/[0.03] border-navy/10 dark:bg-navy/[0.08]">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-navy/10">
              <FileCheck className="w-5 h-5 text-navy" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground">登录后解锁更多能力</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                登录后可以保存项目数据、与团队协作、跨设备同步，并获取智能提醒与异常检测。
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-navy/30 text-navy hover:bg-navy/5"
              onClick={() => router.push("/login")}
            >
              立即登录
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 已登录·有业务状态
// ============================================================

function LoggedInWithBusinessHome({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const today = new Date();
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const blockingCount = mockTodos.filter((t) => t.priority === "blocking").length;
  const riskCount = mockTodos.filter((t) => t.priority === "risk").length;
  const attentionCount = mockTodos.filter((t) => t.priority === "attention").length;

  const handleToolClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="space-y-6">
      {/* 问候 + 日期 + 快捷操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {getGreeting()}，{userName}
          </h1>
          <p className="text-sm text-muted-foreground">{formatDate(today)}</p>
        </div>
        <Button
          className="bg-navy hover:bg-navy-light text-white gap-2 self-start"
          onClick={onOpenDrawer}
        >
          <Plus className="w-4 h-4" />
          新建出口项目
        </Button>
      </div>

      {/* 异常 + 待办摘要 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/30 cursor-pointer hover:shadow-sm transition-shadow"
          onClick={() => document.getElementById("todo-list")?.scrollIntoView({ behavior: "smooth" })}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{blockingCount}</p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">阻断异常</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900/30 cursor-pointer hover:shadow-sm transition-shadow"
          onClick={() => document.getElementById("todo-list")?.scrollIntoView({ behavior: "smooth" })}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{riskCount}</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">风险异常</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10 dark:border-blue-900/30 cursor-pointer hover:shadow-sm transition-shadow"
          onClick={() => document.getElementById("todo-list")?.scrollIntoView({ behavior: "smooth" })}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{attentionCount}</p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">今日待办</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-900/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{mockProjects.length}</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">活跃项目</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 标准出口流程 */}
      <ExportFlow onOpenDrawer={onOpenDrawer} />

      {/* 待办列表 */}
      <div id="todo-list">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            待办与异常
          </h2>
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
            查看全部 <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
        <div className="space-y-1.5">
          {mockTodos.slice(0, 5).map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-card border border-border hover:border-navy/20 hover:shadow-sm transition-all cursor-pointer group"
            >
              <PriorityBadge priority={todo.priority} />
              <span className="flex-1 text-sm text-foreground font-medium truncate">{todo.title}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">{todo.projectName}</span>
              <span className="text-xs text-muted-foreground hidden md:inline">{todo.owner}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{todo.deadline}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          ))}
          {mockTodos.length > 5 && (
            <p className="text-xs text-muted-foreground text-center py-1">还有 {mockTodos.length - 5} 项待办</p>
          )}
        </div>
      </div>

      {/* 活跃项目 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
            活跃出口项目
          </h2>
          <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">
            查看全部 <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {mockProjects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-sm hover:border-navy/20 transition-all cursor-pointer group"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{project.customerName}</h3>
                      {project.hasAnomaly && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          {project.anomalyCount} 异常
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{project.destinationCountry}</p>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-navy/[0.06] text-navy dark:bg-navy/[0.15] dark:text-navy-light">
                    {project.progressLabel}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{project.vehicleCount} 辆项目车辆</span>
                    <span>阶段分布</span>
                  </div>
                  <StageBar stages={project.vehicleStages} total={project.vehicleCount} />
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                    {project.vehicleStages.map((s) => (
                      <span key={s.stage} className="text-[10px] text-muted-foreground">
                        {s.stage} <span className="font-medium text-foreground">{s.count}</span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Play className="w-3.5 h-3.5 text-navy shrink-0" />
                  <span className="text-xs text-foreground flex-1 truncate">{project.nextAction}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {project.nextActionOwner} · {project.nextActionDeadline}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 高频工具 + 角色摘要 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            高频工具
          </h2>
          <div className="space-y-1.5">
            {highFreqTools.slice(0, 4).map((tool) => (
              <button
                key={tool.path}
                onClick={() => handleToolClick(tool.path)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left group"
              >
                <div className="p-1.5 rounded-lg bg-navy/[0.06] text-navy group-hover:bg-navy group-hover:text-white transition-colors">
                  {tool.icon}
                </div>
                <span className="text-sm text-foreground flex-1">{tool.name}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">业务摘要</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">本月出口项目</span>
                <span className="font-medium text-foreground">4</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">本月形式发票</span>
                <span className="font-medium text-foreground">7</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">运输中车辆</span>
                <span className="font-medium text-foreground">3</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">已完成归档</span>
                <span className="font-medium text-foreground">12</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// 已登录·无项目状态
// ============================================================

function LoggedInWithoutProjectsHome({
  onOpenDrawer,
  tempProjects,
}: {
  onOpenDrawer: () => void;
  tempProjects: TempProject[];
}) {
  const router = useRouter();
  const hasProjects = tempProjects.length > 0;

  const handleToolClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="space-y-6">
      {/* 项目创建向导 */}
      <Card className="border-navy/10 bg-card overflow-hidden">
        <CardContent className="p-6 lg:p-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">创建你的第一个出口项目</h1>
          <p className="text-muted-foreground text-sm mb-6 max-w-lg">
            从客户需求开始，逐步添加车辆、生成单证、跟踪物流。系统将自动生成标准待办，帮助你推进每个阶段。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="bg-navy hover:bg-navy-light text-white gap-2"
              onClick={onOpenDrawer}
            >
              <Plus className="w-4 h-4" />
              从客户需求开始
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => router.push("/vehicle-sourcing")}
            >
              <Car className="w-4 h-4" />
              从车辆开始
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 临时出口项目 */}
      {hasProjects && <TempProjectsSection projects={tempProjects} onOpenDrawer={onOpenDrawer} />}

      {/* 快速导入 */}
      {!hasProjects && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="hover:shadow-sm hover:border-navy/20 transition-all cursor-pointer"
          onClick={() => router.push("/customers")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm">导入客户</h3>
              <p className="text-xs text-muted-foreground mt-0.5">从已有客户列表导入</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm hover:border-navy/20 transition-all cursor-pointer"
          onClick={() => router.push("/car-inventory")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm">导入车辆</h3>
              <p className="text-xs text-muted-foreground mt-0.5">从车辆档案中选择</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-sm hover:border-navy/20 transition-all cursor-pointer"
          onClick={() => router.push("/documents")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm">导入单证</h3>
              <p className="text-xs text-muted-foreground mt-0.5">从已有单证记录导入</p>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* 标准出口流程 */}
      <ExportFlow onOpenDrawer={onOpenDrawer} />

      {/* 高频工具 */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          高频工具
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {highFreqTools.map((tool) => (
            <Card
              key={tool.path}
              className="hover:shadow-sm hover:border-navy/30 transition-all cursor-pointer group"
              onClick={() => handleToolClick(tool.path)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="p-2.5 rounded-xl bg-navy/[0.06] text-navy group-hover:bg-navy group-hover:text-white transition-colors">
                  {tool.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">{tool.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{tool.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 主页面
// ============================================================

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [requirementDrawerOpen, setRequirementDrawerOpen] = useState(false);
  const [tempProjects, setTempProjects] = useState<TempProject[]>([]);

  // 加载临时项目
  const refreshTempProjects = useCallback(() => {
    setTempProjects(getTempProjects());
  }, []);

  useEffect(() => {
    refreshTempProjects();
    const unsub = onTempProjectsChange(refreshTempProjects);
    return unsub;
  }, [refreshTempProjects]);

  // 加载中：骨架屏
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-muted rounded-2xl" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  const handleOpenDrawer = () => setRequirementDrawerOpen(true);

  return (
    <>
      {/* 未登录 */}
      {!user && <AnonymousHome onOpenDrawer={handleOpenDrawer} tempProjects={tempProjects} />}

      {/* 已登录 */}
      {user && <LoggedInWithBusinessHome onOpenDrawer={handleOpenDrawer} />}

      {/* 客户需求抽屉 */}
      <CustomerRequirementDrawer
        open={requirementDrawerOpen}
        onOpenChange={setRequirementDrawerOpen}
      />
    </>
  );
}