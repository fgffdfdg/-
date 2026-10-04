"use client";

import { useMemo } from "react";
import {
  INSURANCE_LABELS, MILEAGE_LABELS, BATTERY_LABELS,
  RISK_LEVEL_LABELS, GRADE_LABELS, formatValue,
  type BilingualLabel,
} from "@/lib/vehicle-inspection/report-labels";
import type {
  InsuranceClaimRecord, MileageCheckpoint, BatteryCellGroup,
  BatteryEvaluationItem, BatteryAnnualInspectionItem,
} from "@/lib/vehicle-inspection/types";

// ═══════════════════════════════════════════════════════════════
// 通用组件
// ═══════════════════════════════════════════════════════════════

/** 双语页头标签 */
function SectionTitle({ zh, en }: { zh: string; en: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-4">
      <h3 className="text-base font-semibold text-foreground">{zh}</h3>
      <span className="text-xs text-muted-foreground/60 font-medium tracking-wide">/ {en}</span>
    </div>
  );
}

/** 双语表头 */
function BilingualTh({ label }: { label: BilingualLabel }) {
  return (
    <th className="text-left py-2.5 px-4 border-b-2 border-border bg-muted/30 text-foreground text-sm font-semibold first:rounded-tl-lg last:rounded-tr-lg">
      <span>{label.zh}</span>
      <span className="block text-[11px] text-muted-foreground/50 font-normal mt-0.5">{label.en}</span>
    </th>
  );
}

/** 双语信息行 */
function InfoRow({ label, value, highlight }: { label: BilingualLabel; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-muted/30 transition-colors">
      <span className="text-muted-foreground text-sm">
        {label.zh}
        <span className="text-[11px] text-muted-foreground/40 ml-1">({label.en})</span>
      </span>
      <span className={`text-sm font-medium ${highlight ? 'text-foreground text-base' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

/** 状态徽章 */
function StatusBadge({ status, label }: { status: string; label?: string }) {
  const config: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
    failed: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800",
    pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
  };
  const cls = config[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
      {status === 'failed' && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
      {status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
      {label ?? status}
    </span>
  );
}

/** 指标卡片 */
function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "green" | "amber" | "red" | "blue" }) {
  const accentCls = {
    green: "border-l-emerald-500",
    amber: "border-l-amber-500",
    red: "border-l-red-500",
    blue: "border-l-blue-500",
  };
  return (
    <div className={`bg-card rounded-lg border border-l-[3px] p-4 ${accent ? accentCls[accent] : 'border-l-border'}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/** 进度条 */
function ProgressBar({ value, max, color }: { value: number; max: number; color: "green" | "amber" | "red" }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colorCls = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${colorCls[color]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** 环形进度 */
function RingGauge({ value, max, label, unit }: { value: number; max: number; label: string; unit: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-foreground">{pct}%</span>
          <span className="text-[10px] text-muted-foreground">{unit}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{label}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 出险报告
// ═══════════════════════════════════════════════════════════════

export function InsuranceReportView({ data }: { data: Record<string, unknown> }) {
  const labels = INSURANCE_LABELS;
  const records = (data.records as InsuranceClaimRecord[]) ?? [];
  const claimCount = Number(data.claimCount ?? 0);
  const totalAmount = Number(data.totalAmount ?? 0);
  const hasMajor = String(data.hasMajorAccident ?? '') === 'true' || data.hasMajorAccident === true;

  return (
    <div className="space-y-6">
      {/* 核心指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label={`${labels.claimCount.zh} / ${labels.claimCount.en}`}
          value={claimCount > 0 ? `${claimCount} 次` : '0 次'}
          accent={claimCount > 3 ? 'red' : claimCount > 0 ? 'amber' : 'green'}
        />
        <MetricCard
          label={`${labels.totalAmount.zh} / ${labels.totalAmount.en}`}
          value={formatValue('totalAmount', data.totalAmount)}
          accent={totalAmount > 50000 ? 'red' : totalAmount > 10000 ? 'amber' : 'green'}
        />
        <MetricCard
          label={`${labels.lastClaimDate.zh} / ${labels.lastClaimDate.en}`}
          value={String(data.lastClaimDate ?? '—')}
          accent="blue"
        />
        <MetricCard
          label={`${labels.hasMajorAccident.zh} / ${labels.hasMajorAccident.en}`}
          value={hasMajor ? '是 / Yes' : '否 / No'}
          accent={hasMajor ? 'red' : 'green'}
        />
      </div>

      {/* 车辆信息 */}
      <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
          <SectionTitle zh={labels.vin.zh} en={labels.vin.en} />
        </div>
        <div className="p-5">
          <p className="text-lg font-mono font-bold text-foreground tracking-wider">{String(data.vin ?? '—')}</p>
        </div>
      </div>

      {/* 理赔明细 */}
      {records.length > 0 && (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
            <SectionTitle zh={labels.records.zh} en={labels.records.en} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <BilingualTh label={labels.date} />
                  <BilingualTh label={labels.type} />
                  <BilingualTh label={labels.amount} />
                  <BilingualTh label={labels.damage} />
                  <BilingualTh label={labels.location} />
                  <BilingualTh label={labels.status} />
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-sm font-mono">{r.date}</td>
                    <td className="py-3 px-4 text-sm">{r.type}</td>
                    <td className="py-3 px-4 text-sm font-mono font-semibold">
                      {r.amount > 0 ? `¥${r.amount.toLocaleString('zh-CN')}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm">{r.damage || '—'}</td>
                    <td className="py-3 px-4 text-sm">{r.location || '—'}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.status === '已结案'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                      }`}>
                        {r.status === '已结案' ? '✓ 已结案' : '○ 处理中'}
                        <span className="text-[10px] opacity-60">/ {r.status === '已结案' ? 'Closed' : 'Pending'}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {records.length === 0 && (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm p-12 text-center">
          <p className="text-muted-foreground text-sm">暂无理赔记录 / No Claim Records</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 里程报告
// ═══════════════════════════════════════════════════════════════

export function MileageReportView({ data }: { data: Record<string, unknown> }) {
  const labels = MILEAGE_LABELS;
  const checkpoints = (data.checkpoints as MileageCheckpoint[]) ?? [];
  const riskLevel = String(data.riskLevel ?? 'low');
  const riskLabel = RISK_LEVEL_LABELS[riskLevel] ?? { zh: riskLevel, en: riskLevel };
  const currentMileage = Number(data.currentMileage ?? 0);
  const tamperRisk = String(data.tamperRisk ?? '') === 'true' || data.tamperRisk === true;

  const riskColor = riskLevel === 'high' ? 'red' : riskLevel === 'medium' ? 'amber' : 'green';

  return (
    <div className="space-y-6">
      {/* 里程仪表盘 + 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-card rounded-xl border border-border/60 shadow-sm p-6 flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground mb-2">
            {labels.currentMileage.zh} / {labels.currentMileage.en}
          </p>
          <p className="text-3xl font-bold text-foreground font-mono tracking-tight">
            {formatValue('currentMileage', data.currentMileage)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">km</p>
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <MetricCard
            label={`${labels.annualAverage.zh} / ${labels.annualAverage.en}`}
            value={formatValue('annualAverage', data.annualAverage)}
            sub="km/年"
            accent="blue"
          />
          <MetricCard
            label={`${labels.lastRecordDate.zh} / ${labels.lastRecordDate.en}`}
            value={String(data.lastRecordDate ?? '—')}
            accent="blue"
          />
          <MetricCard
            label={`${labels.tamperRisk.zh} / ${labels.tamperRisk.en}`}
            value={tamperRisk ? '⚠ 是 / Yes' : '✓ 否 / No'}
            accent={tamperRisk ? 'red' : 'green'}
          />
          <MetricCard
            label={`${labels.riskLevel.zh} / ${labels.riskLevel.en}`}
            value={`${riskLabel.zh} / ${riskLabel.en}`}
            accent={riskColor}
          />
        </div>
      </div>

      {/* 车辆信息 */}
      <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
          <SectionTitle zh={labels.vin.zh} en={labels.vin.en} />
        </div>
        <div className="p-5">
          <p className="text-lg font-mono font-bold text-foreground tracking-wider">{String(data.vin ?? '—')}</p>
        </div>
      </div>

      {/* 历史里程记录 */}
      {checkpoints.length > 0 && (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
            <SectionTitle zh={labels.checkpoints.zh} en={labels.checkpoints.en} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <BilingualTh label={labels.date} />
                  <BilingualTh label={labels.mileage} />
                  <BilingualTh label={labels.source} />
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((c, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-sm font-mono">{c.date}</td>
                    <td className="py-3 px-4 text-sm font-mono font-semibold">{formatValue('mileage', c.mileage)}</td>
                    <td className="py-3 px-4 text-sm">{c.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {checkpoints.length === 0 && (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm p-12 text-center">
          <p className="text-muted-foreground text-sm">暂无历史里程记录 / No Mileage Records</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 电池健康度报告
// ═══════════════════════════════════════════════════════════════

export function BatteryReportView({ data }: { data: Record<string, unknown> }) {
  const labels = BATTERY_LABELS;
  const grade = String(data.grade ?? '一般');
  const gradeLabel = GRADE_LABELS[grade] ?? { zh: grade, en: grade };
  const cellGroups = (data.cellGroups as BatteryCellGroup[]) ?? [];
  const evaluations = (data.evaluations as BatteryEvaluationItem[]) ?? [];
  const annualInspections = (data.annualInspections as BatteryAnnualInspectionItem[]) ?? [];
  const alarm = data.alarm90d as Record<string, string> | undefined;
  const suggestion = String(data.suggestion ?? '');
  const soh = Number(data.soh ?? 0);

  const gradeColor = grade === 'A' ? 'green' : grade === 'B' ? 'green' : grade === 'C' ? 'amber' : 'red';
  const sohColor = soh >= 85 ? 'green' : soh >= 70 ? 'amber' : 'red';

  return (
    <div className="space-y-6">
      {/* SOH 仪表盘 */}
      <div className="bg-card rounded-xl border border-border/60 shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <RingGauge
            value={soh} max={100}
            label={`${labels.soh.zh} / ${labels.soh.en}`}
            unit="SOH"
          />
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard
              label={`${labels.grade.zh} / ${labels.grade.en}`}
              value={`${gradeLabel.zh} / ${gradeLabel.en}`}
              accent={gradeColor}
            />
            <MetricCard
              label={`${labels.currentCapacity.zh} / ${labels.currentCapacity.en}`}
              value={formatValue('currentCapacity', data.currentCapacity)}
              accent={soh >= 85 ? 'green' : soh >= 70 ? 'amber' : 'red'}
            />
            <MetricCard
              label={`${labels.cycleCount.zh} / ${labels.cycleCount.en}`}
              value={formatValue('cycleCount', data.cycleCount)}
              accent="blue"
            />
            <MetricCard
              label={`${labels.fullEndurance.zh} / ${labels.fullEndurance.en}`}
              value={formatValue('fullEndurance', data.fullEndurance)}
              accent="blue"
            />
            <MetricCard
              label={`${labels.degradationRate.zh} / ${labels.degradationRate.en}`}
              value={formatValue('degradationRate', data.degradationRate)}
              accent={soh >= 85 ? 'green' : 'amber'}
            />
            <MetricCard
              label={`${labels.batteryValuation.zh} / ${labels.batteryValuation.en}`}
              value={formatValue('batteryValuation', data.batteryValuation)}
              accent="blue"
            />
          </div>
        </div>
      </div>

      {/* 评分详情 */}
      {['healthScore', 'capacityScore', 'temperatureScore', 'voltageScore', 'internalResistanceScore', 'isolationScore'].some(k => data[k] !== undefined && data[k] !== null && Number(data[k]) > 0) && (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
            <SectionTitle zh="评分详情" en="Score Details" />
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
            {['healthScore', 'capacityScore', 'temperatureScore', 'voltageScore', 'internalResistanceScore', 'isolationScore'].map(k => {
              const label = labels[k];
              const val = Number(data[k] ?? 0);
              if (!label || val === 0) return null;
              const barColor = val >= 80 ? 'green' : val >= 60 ? 'amber' : 'red';
              return (
                <div key={k}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">
                      {label.zh} <span className="text-[10px] opacity-50">({label.en})</span>
                    </span>
                    <span className="text-xs font-semibold text-foreground">{val}分</span>
                  </div>
                  <ProgressBar value={val} max={100} color={barColor} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 充电信息 */}
      {['avgStartSoc', 'avgEndSoc', 'depthOfCharge', 'fastChargingRate'].some(k => data[k] !== undefined && data[k] !== null && Number(data[k]) > 0) && (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
            <SectionTitle zh="充电信息" en="Charging Info" />
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {['avgStartSoc', 'avgEndSoc', 'depthOfCharge', 'fastChargingRate'].map(k => {
              const label = labels[k];
              const val = Number(data[k] ?? 0);
              if (!label || val === 0) return null;
              return <InfoRow key={k} label={label} value={formatValue(k, data[k])} />;
            })}
          </div>
        </div>
      )}

      {/* 电芯组 */}
      {cellGroups.length > 0 && (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
            <SectionTitle zh={labels.cellGroups.zh} en={labels.cellGroups.en} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <BilingualTh label={labels.name} />
                  <BilingualTh label={labels.voltage} />
                  <BilingualTh label={labels.temperature} />
                  <BilingualTh label={labels.soh} />
                </tr>
              </thead>
              <tbody>
                {cellGroups.map((cg, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{cg.name}</td>
                    <td className="py-3 px-4 text-sm font-mono">{formatValue('voltage', cg.voltage)}</td>
                    <td className="py-3 px-4 text-sm font-mono">{formatValue('temperature', cg.temperature)}</td>
                    <td className="py-3 px-4 text-sm font-mono">
                      <span className={`font-semibold ${Number(cg.soh) >= 85 ? 'text-emerald-600 dark:text-emerald-400' : Number(cg.soh) >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatValue('soh', cg.soh)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 一致性对比 */}
      {evaluations.length > 0 && (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
            <SectionTitle zh={labels.evaluations.zh} en={labels.evaluations.en} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <BilingualTh label={labels.name} />
                  <BilingualTh label={labels.ownData} />
                  <BilingualTh label={labels.otherData} />
                  <BilingualTh label={labels.result} />
                </tr>
              </thead>
              <tbody>
                {evaluations.map((ev, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{ev.name}</td>
                    <td className="py-3 px-4 text-sm font-mono">{ev.ownData}</td>
                    <td className="py-3 px-4 text-sm font-mono">{ev.otherData}</td>
                    <td className="py-3 px-4 text-sm">{ev.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 年检信息 */}
      {annualInspections.length > 0 && (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
            <SectionTitle zh={labels.annualInspections.zh} en={labels.annualInspections.en} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <BilingualTh label={labels.name} />
                  <BilingualTh label={labels.standard} />
                  <BilingualTh label={labels.ownValue} />
                  <BilingualTh label={labels.result} />
                </tr>
              </thead>
              <tbody>
                {annualInspections.map((ai, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium">{ai.name}</td>
                    <td className="py-3 px-4 text-sm font-mono">{ai.standard}</td>
                    <td className="py-3 px-4 text-sm font-mono">{ai.ownValue}</td>
                    <td className="py-3 px-4 text-sm">{ai.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 报警 */}
      {alarm && (alarm.l1 || alarm.l2 || alarm.l3) && (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
            <SectionTitle zh={labels.alarm90d.zh} en={labels.alarm90d.en} />
          </div>
          <div className="p-5 grid grid-cols-3 gap-4">
            <InfoRow label={labels.l1} value={alarm.l1 || '—'} />
            <InfoRow label={labels.l2} value={alarm.l2 || '—'} />
            <InfoRow label={labels.l3} value={alarm.l3 || '—'} />
          </div>
        </div>
      )}

      {/* 生产信息 */}
      {['manufacturer', 'batteryModel', 'nominalEnergy', 'energyDensity', 'batteryWeight', 'warranty', 'powerChange', 'engineType'].some(k => data[k] !== undefined && data[k] !== null && data[k] !== '') && (
        <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/20">
            <SectionTitle zh="生产信息" en="Manufacturing Info" />
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {['manufacturer', 'batteryModel', 'nominalEnergy', 'energyDensity', 'batteryWeight', 'warranty', 'powerChange', 'engineType'].map(k => {
              const label = labels[k];
              const val = data[k];
              if (!label || val === undefined || val === null || val === '') return null;
              return <InfoRow key={k} label={label} value={formatValue(k, val)} />;
            })}
          </div>
        </div>
      )}

      {/* 养护建议 */}
      {suggestion && (
        <div className="bg-primary/5 rounded-xl border border-primary/20 p-5">
          <SectionTitle zh={labels.suggestion.zh} en={labels.suggestion.en} />
          <p className="text-sm text-muted-foreground leading-relaxed">{suggestion}</p>
        </div>
      )}
    </div>
  );
}