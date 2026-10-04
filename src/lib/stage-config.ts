// 标准出口流程阶段配置
// 集中管理阶段信息、路由映射、下一步动作

import type { CustomerRequirement } from "./temp-project";

export const EXPORT_STAGES = [
  { label: "客户需求", key: "requirement", icon: "UserPlus" },
  { label: "找车与验车", key: "vehicle-sourcing", icon: "Search" },
  { label: "报价", key: "quote", icon: "Calculator" },
  { label: "签约", key: "contract", icon: "FileCheck" },
  { label: "车辆采购", key: "procurement", icon: "Car" },
  { label: "单证与许可证", key: "documents", icon: "FileText" },
  { label: "报关", key: "customs", icon: "Anchor" },
  { label: "物流", key: "logistics", icon: "Ship" },
  { label: "结算归档", key: "settlement", icon: "FileCheck" },
] as const;

/** 每个阶段可用的路由 */
export const STAGE_ROUTES: Record<number, string | null> = {
  1: null, // 客户需求：打开编辑模式（在详情页内完成）
  2: "/vehicle-sourcing", // 找车与验车
  3: "/quote-calculator", // 报价
  4: null, // 签约：功能建设中
  5: "/procurement", // 车辆采购
  6: "/documents", // 单证与许可证
  7: "/customs-declaration", // 报关
  8: "/tracking", // 物流
  9: null, // 结算归档：功能建设中
};

/** 获取阶段路由（带项目上下文参数） */
export function getStageRoute(
  stage: number,
  projectId: string,
  req: CustomerRequirement
): string | null {
  const base = STAGE_ROUTES[stage];
  if (!base) return null;

  const params = new URLSearchParams();
  params.set("projectId", projectId);

  switch (stage) {
    case 2: // 找车与验车
      if (req.destinationCountry) params.set("country", req.destinationCountry);
      if (req.vehicleRequirements) params.set("vehicleReq", req.vehicleRequirements);
      break;
    case 3: // 报价
      if (req.destinationCountry) params.set("country", req.destinationCountry);
      if (req.budgetRange) params.set("budget", req.budgetRange);
      break;
    case 5: // 车辆采购
      if (req.vehicleRequirements) params.set("vehicleReq", req.vehicleRequirements);
      break;
  }

  return `${base}?${params.toString()}`;
}

/** 获取阶段下一步动作文案 */
export function getStageNextAction(
  stage: number,
  projectId: string,
  req: CustomerRequirement
): string {
  const actions: Record<number, string> = {
    1: "完善客户需求信息",
    2: "匹配候选车源并完成车辆查验",
    3: "准备报价方案",
    4: "准备签约文件",
    5: "采购车辆并办理转移登记",
    6: "准备出口单证与许可证",
    7: "准备报关文件",
    8: "安排国际物流运输",
    9: "完成结算并归档项目文件",
  };
  return actions[stage] || `完成第 ${stage} 阶段`;
}