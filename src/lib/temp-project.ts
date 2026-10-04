// 临时出口项目 localStorage 存储工具
// 匿名用户：临时出口项目（temporary）
// 登录用户：正式出口项目（formal，后续迁移到 DB）

import { STAGE_ROUTES, EXPORT_STAGES, getStageRoute, getStageNextAction } from "./stage-config";

// 重新导出，方便其他模块使用
export { STAGE_ROUTES, EXPORT_STAGES, getStageRoute, getStageNextAction };

export interface CustomerRequirement {
  customerId?: string;
  customerName: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  destinationCountry: string;
  vehicleRequirements: string;
  quantity: number;
  budgetRange: string;
  expectedDelivery: string;
  otherRequirements: string;
}

/** 工作待办 */
export interface ProjectTodo {
  id: string;
  title: string;
  stage: number; // 1-9 对应 EXPORT_STAGES
  status: "pending" | "in_progress" | "completed";
  deadline?: string; // ISO
  description?: string;
  actionRoute?: string; // 操作入口路由
  createdAt: string;
  completedAt?: string;
}

export interface TempProject {
  id: string;
  type: "temporary" | "formal";
  userId?: string;
  status: "draft" | "active";
  /** 当前所处阶段编号：1=客户需求, 2=找车与验车, 3=报价, ..., 9=结算归档 */
  currentStage: number;
  /** 已完成阶段编号列表 */
  completedStages: number[];
  requirement: CustomerRequirement;
  /** 工作待办列表 */
  todos: ProjectTodo[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "exportdrive-temp-projects";
const CHANGE_EVENT = "exportdrive-temp-projects-changed";

function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================
// 变更事件 — 跨组件同步
// ============================================================

/** 监听 localStorage 变更（跨组件） */
export function onTempProjectsChange(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

function notifyChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

// ============================================================
// 待办生成
// ============================================================

/** 根据项目当前阶段和需求自动生成待办 */
export function generateTodos(project: TempProject): ProjectTodo[] {
  const now = new Date().toISOString();
  const req = project.requirement;
  const todos: ProjectTodo[] = [];

  // 为每个阶段生成一条核心待办（从 currentStage 开始）
  for (let stage = project.currentStage; stage <= EXPORT_STAGES.length; stage++) {
    const stageLabel = EXPORT_STAGES[stage - 1].label;
    const action = getStageNextAction(stage, project.id, req);
    const route = getStageRoute(stage, project.id, req);

    const descriptions: Record<number, string> = {
      1: "记录客户需求、目的国和车辆要求",
      2: "匹配候选车源并完成车辆查验",
      3: "根据客户需求和车源准备报价方案",
      4: "准备签约文件，确认交易条款",
      5: "采购车辆，办理转移登记",
      6: "准备出口单证与许可证",
      7: "准备报关文件，办理出口申报",
      8: "安排国际物流运输",
      9: "完成结算并归档项目文件",
    };

    todos.push({
      id: `todo_${project.id}_${stage}`,
      title: action,
      stage,
      status: stage === project.currentStage ? "in_progress" : "pending",
      description: descriptions[stage] || "",
      actionRoute: route || undefined,
      createdAt: now,
    });
  }

  return todos;
}

// ============================================================
// 版本兼容与数据校验
// ============================================================

function sanitizeProject(raw: unknown): TempProject | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== "string" || !p.id) return null;
  if (typeof p.createdAt !== "string") return null;

  const requirement: CustomerRequirement = {
    customerName: typeof (p.requirement as Record<string, unknown>)?.customerName === "string"
      ? (p.requirement as Record<string, unknown>).customerName as string : "",
    destinationCountry: typeof (p.requirement as Record<string, unknown>)?.destinationCountry === "string"
      ? (p.requirement as Record<string, unknown>).destinationCountry as string : "",
    vehicleRequirements: typeof (p.requirement as Record<string, unknown>)?.vehicleRequirements === "string"
      ? (p.requirement as Record<string, unknown>).vehicleRequirements as string : "",
    quantity: typeof (p.requirement as Record<string, unknown>)?.quantity === "number"
      ? (p.requirement as Record<string, unknown>).quantity as number : 0,
    budgetRange: typeof (p.requirement as Record<string, unknown>)?.budgetRange === "string"
      ? (p.requirement as Record<string, unknown>).budgetRange as string : "",
    expectedDelivery: typeof (p.requirement as Record<string, unknown>)?.expectedDelivery === "string"
      ? (p.requirement as Record<string, unknown>).expectedDelivery as string : "",
    otherRequirements: typeof (p.requirement as Record<string, unknown>)?.otherRequirements === "string"
      ? (p.requirement as Record<string, unknown>).otherRequirements as string : "",
    contactName: typeof (p.requirement as Record<string, unknown>)?.contactName === "string"
      ? (p.requirement as Record<string, unknown>).contactName as string : undefined,
    contactPhone: typeof (p.requirement as Record<string, unknown>)?.contactPhone === "string"
      ? (p.requirement as Record<string, unknown>).contactPhone as string : undefined,
    contactEmail: typeof (p.requirement as Record<string, unknown>)?.contactEmail === "string"
      ? (p.requirement as Record<string, unknown>).contactEmail as string : undefined,
    customerId: typeof (p.requirement as Record<string, unknown>)?.customerId === "string"
      ? (p.requirement as Record<string, unknown>).customerId as string : undefined,
  };

  const currentStage = migrateCurrentStage(
    typeof (p as Record<string, unknown>).currentStage === "number"
      ? (p as Record<string, unknown>).currentStage as number
      : undefined,
    p.updatedAt as string | undefined
  );

  // 兼容旧数据：completedStages
  const rawCompleted = (p as Record<string, unknown>).completedStages;
  const completedStages: number[] = Array.isArray(rawCompleted)
    ? rawCompleted.filter((v): v is number => typeof v === "number" && v >= 1 && v <= 9)
    : [];

  // 兼容旧数据：todos
  const rawTodos = (p as Record<string, unknown>).todos;
  let todos: ProjectTodo[] = [];
  if (Array.isArray(rawTodos) && rawTodos.length > 0) {
    todos = rawTodos.filter(
      (t): t is ProjectTodo =>
        typeof t === "object" && t !== null && typeof (t as Record<string, unknown>).id === "string"
    );
  }

  const project: TempProject = {
    id: p.id as string,
    type: (p.type as TempProject["type"]) || "temporary",
    userId: typeof p.userId === "string" ? p.userId : undefined,
    status: (p.status as TempProject["status"]) || "active",
    currentStage,
    completedStages,
    requirement,
    todos,
    createdAt: p.createdAt as string,
    updatedAt: (typeof p.updatedAt === "string" ? p.updatedAt : p.createdAt) as string,
  };

  // 旧项目无待办时自动补齐
  if (todos.length === 0) {
    project.todos = generateTodos(project);
  }

  return project;
}

/**
 * 阶段迁移：旧版本（8 阶段）插入"找车与验车"后，2-8 顺延为 3-9
 * 仅在无 currentStage 字段的旧数据上执行
 */
function migrateCurrentStage(stage: number | undefined, _updatedAt?: string): number {
  if (typeof stage === "number") return stage;
  return 1;
}

// ============================================================
// CRUD
// ============================================================

export function getTempProjects(): TempProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeProject).filter((p): p is TempProject => p !== null);
  } catch {
    return [];
  }
}

export function getTempProject(id: string): TempProject | null {
  return getTempProjects().find((p) => p.id === id) || null;
}

function persist(projects: TempProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  notifyChange();
}

export function saveTempProject(
  requirement: CustomerRequirement,
  userId?: string
): TempProject {
  const now = new Date().toISOString();
  const project: TempProject = {
    id: generateId(),
    type: userId ? "formal" : "temporary",
    userId,
    status: "active",
    currentStage: 1,
    completedStages: [],
    requirement,
    todos: [],
    createdAt: now,
    updatedAt: now,
  };
  // 新项目生成待办
  project.todos = generateTodos(project);

  const projects = getTempProjects();
  projects.unshift(project);
  persist(projects);

  return project;
}

export function saveRequirementOnly(
  requirement: CustomerRequirement,
  userId?: string
): TempProject {
  const now = new Date().toISOString();
  const project: TempProject = {
    id: generateId(),
    type: userId ? "formal" : "temporary",
    userId,
    status: "draft",
    currentStage: 1,
    completedStages: [],
    requirement,
    todos: [],
    createdAt: now,
    updatedAt: now,
  };
  project.todos = generateTodos(project);

  const projects = getTempProjects();
  projects.unshift(project);
  persist(projects);

  return project;
}

export function createEmptyProject(userId?: string): TempProject {
  const now = new Date().toISOString();
  const project: TempProject = {
    id: generateId(),
    type: userId ? "formal" : "temporary",
    userId,
    status: "active",
    currentStage: 1,
    completedStages: [],
    requirement: {
      customerName: "",
      destinationCountry: "",
      vehicleRequirements: "",
      quantity: 0,
      budgetRange: "",
      expectedDelivery: "",
      otherRequirements: "",
    },
    todos: [],
    createdAt: now,
    updatedAt: now,
  };
  project.todos = generateTodos(project);

  const projects = getTempProjects();
  projects.unshift(project);
  persist(projects);

  return project;
}

export function updateTempProject(
  id: string,
  updates: Partial<Pick<TempProject, "status" | "requirement" | "currentStage" | "completedStages" | "todos">>
): TempProject | null {
  const projects = getTempProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  projects[idx] = {
    ...projects[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  persist(projects);
  return projects[idx];
}

/** 更新单条待办状态 */
export function updateTodoStatus(
  projectId: string,
  todoId: string,
  status: ProjectTodo["status"]
): TempProject | null {
  const projects = getTempProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx === -1) return null;

  const project = projects[idx];
  const todoIdx = project.todos.findIndex((t) => t.id === todoId);
  if (todoIdx === -1) return null;

  const now = new Date().toISOString();
  project.todos[todoIdx] = {
    ...project.todos[todoIdx],
    status,
    completedAt: status === "completed" ? now : undefined,
  };

  // 如果完成的是当前阶段待办，自动推进到下一阶段
  if (status === "completed" && project.todos[todoIdx].stage === project.currentStage) {
    // 标记当前阶段为已完成
    if (!project.completedStages.includes(project.currentStage)) {
      project.completedStages = [...project.completedStages, project.currentStage];
    }
    // 推进到下一阶段
    if (project.currentStage < EXPORT_STAGES.length) {
      project.currentStage = project.currentStage + 1;
      // 更新新当前阶段的待办为进行中
      project.todos = project.todos.map((t) => {
        if (t.stage === project.currentStage && t.status === "pending") {
          return { ...t, status: "in_progress" as const };
        }
        return t;
      });
    }
  }

  project.updatedAt = now;
  projects[idx] = project;
  persist(projects);
  return project;
}

/** 手动推进阶段（标记当前阶段完成，激活下一阶段待办） */
export function advanceStage(projectId: string): TempProject | null {
  const projects = getTempProjects();
  const idx = projects.findIndex((p) => p.id === projectId);
  if (idx === -1) return null;

  const project = projects[idx];
  if (project.currentStage >= EXPORT_STAGES.length) return project; // 已是最后阶段

  const now = new Date().toISOString();
  // 标记当前阶段完成
  if (!project.completedStages.includes(project.currentStage)) {
    project.completedStages = [...project.completedStages, project.currentStage];
  }
  // 完成当前阶段待办
  project.todos = project.todos.map((t) => {
    if (t.stage === project.currentStage && t.status !== "completed") {
      return { ...t, status: "completed" as const, completedAt: now };
    }
    return t;
  });
  // 推进
  project.currentStage = project.currentStage + 1;
  // 激活新阶段待办
  project.todos = project.todos.map((t) => {
    if (t.stage === project.currentStage && t.status === "pending") {
      return { ...t, status: "in_progress" as const };
    }
    return t;
  });
  project.updatedAt = now;
  projects[idx] = project;
  persist(projects);
  return project;
}

export function deleteTempProject(id: string): boolean {
  const projects = getTempProjects();
  const filtered = projects.filter((p) => p.id !== id);
  if (filtered.length === projects.length) return false;
  persist(filtered);
  return true;
}

export function getRecentTempProjects(limit = 5): TempProject[] {
  return getTempProjects().slice(0, limit);
}