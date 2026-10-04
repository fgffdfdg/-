"use client";

import {
  BatteryReport,
  InsuranceReport,
  MileageReport,
  SavedReport,
} from "@/lib/vehicle-inspection/types";
import { useState, useEffect } from "react";
import { L, transEnum, renderText, getLangMode, setLangMode, subscribeLangMode, type ReportLangMode, type BiPair } from "@/lib/vehicle-inspection/i18n";
import {
  AlertTriangle,
  Battery as BatteryIcon,
  CheckCircle2,
  Gauge,
  MapPin,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function formatMoney(n: number): string {
  return `¥${n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 双语键值标签 — 中文主标题，英文小字辅助 */
function BiLabel({ pair }: { pair: BiPair }) {
  return (
    <p className="text-[11px] leading-tight text-muted-foreground">
      <span>{pair.zh}</span>
      <span className="mx-1 text-muted-foreground/40">/</span>
      <span className="text-[10px]">{pair.en}</span>
    </p>
  );
}

function KV({ label, value, danger }: { label: BiPair; value: React.ReactNode; danger?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <BiLabel pair={label} />
      <p className={`text-sm font-semibold mt-1 ${danger ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

/** 双语字符串值（如状态、事故类型等枚举） */
function BiText({ value, className }: { value: string | null | undefined; className?: string }) {
  const t = transEnum(value);
  if (!t) return <span className={className}>{value ?? "—"}</span>;
  return (
    <span className={className} title={t.en}>
      {t.zh}
      <span className="ml-1 text-[10px] font-normal text-muted-foreground/70">/ {t.en}</span>
    </span>
  );
}

/** 表头双语：中文主，英文在下 */
function ThCell({ zh, en, className }: { zh: React.ReactNode; en: string; className?: string }) {
  return (
    <th className={`px-3 py-2 text-xs font-medium text-muted-foreground ${className ?? "text-left"}`}>
      <div>{zh}</div>
      <div className="text-[10px] font-normal text-muted-foreground/60">{en}</div>
    </th>
  );
}

// ─── 出险 ──────────────────────────────────────────────────
function InsuranceScreen({ data }: { data: InsuranceReport }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KV label={L.claimCount} value={`${data.claimCount} 次 / claims`} />
        <KV label={L.totalPayout} value={formatMoney(data.totalAmount)} />
        <KV label={L.lastClaim} value={data.lastClaimDate ?? "—"} />
        <KV
          label={L.majorAccident}
          value={data.hasMajorAccident ? <BiText value="存在" /> : <BiText value="无" />}
          danger={data.hasMajorAccident}
        />
      </div>
      <Separator />
      {data.records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 text-center">
          <p className="text-sm text-foreground">{renderText(L.noClaimRecords)}</p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">{L.noClaimRecords.en}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.records.map((r, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4"
            >
              <div className="flex items-center gap-2 md:w-36 shrink-0">
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-medium">{r.date}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    <BiText value={r.type} />
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    <BiText value={r.status} />
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span>{renderText(L.damagePart)}</span>
                  <span className="mx-1 text-muted-foreground/40">/</span>
                  <span>{L.damagePart.en}: </span>
                  <span className="text-foreground/80">{r.damage}</span>
                </p>
                {r.location && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {r.location}
                  </p>
                )}
              </div>
              <div className="text-right md:w-28 shrink-0">
                <BiLabel pair={L.payout} />
                <p
                  className={`text-sm font-bold mt-1 ${
                    r.amount > 20000 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {formatMoney(r.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 里程 ──────────────────────────────────────────────────
function MileageScreen({ data }: { data: MileageReport }) {
  const riskPair = data.riskLevel === "high" ? L.riskHigh : data.riskLevel === "medium" ? L.riskMedium : L.riskLow;
  const riskTone =
    data.riskLevel === "high"
      ? "text-destructive"
      : data.riskLevel === "medium"
        ? "text-amber-600 dark:text-amber-400"
        : "text-success";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KV label={L.currentMileage} value={`${data.currentMileage.toLocaleString()} km`} />
        <KV label={L.annualAvg} value={`${data.annualAverage.toLocaleString()} km`} />
        <KV label={L.latestRecord} value={data.lastRecordDate} />
        <KV
          label={L.tamperRisk}
          value={
            <span>
              {riskPair.zh}
              <span className="ml-1 text-[10px] font-normal opacity-70">/ {riskPair.en}</span>
            </span>
          }
          danger={data.riskLevel !== "low"}
        />
      </div>
      <Separator />
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <ThCell zh={renderText(L.recordDate)} en={L.recordDate.en} />
              <ThCell zh={renderText(L.mileageReading)} en={L.mileageReading.en} />
              <ThCell zh={renderText(L.dataSourceField)} en={L.dataSourceField.en} />
              <ThCell zh={renderText(L.remark)} en={L.remark.en} />
            </tr>
          </thead>
          <tbody>
            {data.checkpoints.map((c, i) => {
              const prev = data.checkpoints[i - 1];
              const anomaly = prev && c.mileage < prev.mileage;
              const sourceT = transEnum(c.source);
              return (
                <tr
                  key={i}
                  className={`border-t border-border ${anomaly ? "bg-rose-50 dark:bg-rose-950/20" : ""}`}
                >
                  <td className="px-3 py-2 text-foreground">{c.date}</td>
                  <td className="px-3 py-2 font-mono text-foreground">
                    {c.mileage.toLocaleString()} km
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {sourceT ? (
                      <>
                        {sourceT.zh}
                        {sourceT.en !== sourceT.zh && (
                          <span className="ml-1 text-[10px] text-muted-foreground/60">/ {sourceT.en}</span>
                        )}
                      </>
                    ) : (
                      c.source
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {anomaly ? (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive" title={L.suspectedRollback.en}>
                        <AlertTriangle className="h-3 w-3" />
                        {renderText(L.suspectedRollback)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={`text-xs flex items-start gap-1.5 ${riskTone}`}>
        {data.tamperRisk ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {renderText(L.rollbackDetected)}
              <br />
              <span className="text-[11px] opacity-80">{L.rollbackDetected.en}</span>
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {renderText(L.noRollback)}
              <br />
              <span className="text-[11px] opacity-80">{L.noRollback.en}</span>
            </span>
          </>
        )}
      </p>
    </div>
  );
}

// ─── 电池 ──────────────────────────────────────────────────
function BatteryScreen({ data }: { data: BatteryReport }) {
  const gradeTone =
    data.grade === "优秀"
      ? "text-success"
      : data.grade === "良好"
        ? "text-emerald-600 dark:text-emerald-400"
        : data.grade === "一般"
          ? "text-amber-600 dark:text-amber-400"
          : "text-destructive";
  const sohTone =
    data.soh >= 90
      ? "text-success"
      : data.soh >= 80
        ? "text-emerald-600 dark:text-emerald-400"
        : data.soh >= 75
          ? "text-amber-600 dark:text-amber-400"
          : "text-destructive";

  const scoreList: Array<[BiPair, number | undefined]> = [
    [L.healthScore, data.healthScore],
    [L.capacityScore, data.capacityScore],
    [L.tempConsistency, data.temperatureScore],
    [L.voltageConsistency, data.voltageScore],
    [L.irConsistency, data.internalResistanceScore],
    [L.selfDischarge, data.isolationScore],
  ];

  const cellScoreTone = (v: number) =>
    v >= 85 ? "text-success" : v >= 75 ? "text-amber-600 dark:text-amber-400" : "text-destructive";
  const scoreTone = (v: number | undefined) =>
    v === undefined
      ? "text-muted-foreground"
      : v >= 90
        ? "text-success"
        : v >= 75
          ? "text-amber-600 dark:text-amber-400"
          : "text-destructive";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KV label={L.soh} value={<span className={sohTone}>{data.soh}%</span>} />
        <KV
          label={L.overallGrade}
          value={
            <span className={gradeTone}>
              <BiText value={data.grade} />
              {data.rawGrade && data.rawGrade !== data.grade ? ` (${data.rawGrade})` : ""}
            </span>
          }
        />
        <KV label={L.batteryType} value={<BiText value={data.batteryType || "—"} />} />
        <KV label={L.engineType} value={<BiText value={data.engineType || "—"} />} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KV label={L.fullEndurance} value={data.fullEndurance ? `${data.fullEndurance} km` : "—"} />
        <KV label={L.nominalEndurance} value={data.nominalEndurance ? `${data.nominalEndurance} km` : "—"} />
        <KV label={L.currentCapacity} value={data.currentCapacity > 0 ? `${data.currentCapacity} Ah` : "—"} />
        <KV label={L.nominalEnergy} value={data.nominalEnergy ? `${data.nominalEnergy} kWh` : "—"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KV label={L.totalMileage} value={data.totalMileage ? `${data.totalMileage.toLocaleString()} km` : "—"} />
        <KV label={L.mileageDate} value={data.totalMileageDate || "—"} />
        <KV label={L.degradationRate} value={data.degradationRate !== undefined ? `${data.degradationRate}%/年 · yr` : "—"} />
        <KV label={L.batteryValuation} value={data.batteryValuation ? `¥${data.batteryValuation.toLocaleString()}` : "—"} />
      </div>

      <Separator />

      {/* 一致性得分 */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Gauge className="h-4 w-4 text-sky-500" />
          {renderText(L.consistencyScores)}
          <span className="text-[11px] font-normal text-muted-foreground/70">/ {L.consistencyScores.en}</span>
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {scoreList.map(([pair, v]) => (
            <div
              key={pair.zh}
              className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between"
            >
              <div>
                <p className="text-xs text-foreground">{pair.zh}</p>
                <p className="text-[10px] text-muted-foreground/70">{pair.en}</p>
              </div>
              <span className={`text-sm font-bold ${scoreTone(v)}`}>{v !== undefined ? `${v}` : "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 电芯/年检指标 */}
      {data.cellGroups.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <BatteryIcon className="h-4 w-4 text-amber-500" />
            {renderText(L.keyCellMetrics)}
            <span className="text-[11px] font-normal text-muted-foreground/70">/ {L.keyCellMetrics.en}</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {data.cellGroups.map((g, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {g.voltage > 0 ? `${g.voltage.toFixed(2)} V` : ""}
                    {g.voltage > 0 && g.temperature > 0 ? " · " : ""}
                    {g.temperature > 0 ? `${g.temperature.toFixed(1)} ℃` : ""}
                  </p>
                </div>
                <div className="text-right ml-2">
                  <BiLabel pair={L.score} />
                  <p className={`text-sm font-bold mt-1 ${cellScoreTone(g.soh)}`}>{g.soh || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 年检信息 */}
      {data.annualInspections && data.annualInspections.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {renderText(L.annualInspection)}
            <span className="text-[11px] font-normal text-muted-foreground/70">/ {L.annualInspection.en}</span>
          </h4>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <ThCell zh={renderText(L.inspectionItem)} en={L.inspectionItem.en} />
                  <ThCell zh={renderText(L.standard)} en={L.standard.en} />
                  <ThCell zh={renderText(L.measured)} en={L.measured.en} />
                  <ThCell zh={renderText(L.conclusion)} en={L.conclusion.en} />
                </tr>
              </thead>
              <tbody>
                {data.annualInspections.map((it, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">{it.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{it.standard}</td>
                    <td className="px-3 py-2 font-medium">{it.ownValue}</td>
                    <td className="px-3 py-2">
                      <Badge variant={it.result.includes("合格") ? "default" : "destructive"} className="text-[10px] font-normal">
                        <BiText value={it.result} />
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 一致性对比 */}
      {data.evaluations && data.evaluations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">
            {renderText(L.consistencyCompare)}
            <span className="ml-1 text-[11px] font-normal text-muted-foreground/70">/ {L.consistencyCompare.en}</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.evaluations.map((it, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{it.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    <span>{renderText(L.vehicleValue)}</span>
                    <span className="mx-1 text-muted-foreground/40">/</span>
                    <span>{L.vehicleValue.en}:</span>
                    <span className="text-foreground/80 ml-0.5">{it.ownData}</span>
                    <span className="mx-1.5">·</span>
                    <span>{renderText(L.peerAverage)}</span>
                    <span className="mx-1 text-muted-foreground/40">/</span>
                    <span>{L.peerAverage.en}:</span>
                    <span className="text-foreground/80 ml-0.5">{it.otherData}</span>
                  </p>
                </div>
                <Badge
                  variant={it.result.includes("优秀") || it.result.includes("良好") ? "default" : "secondary"}
                  className="text-[10px] font-normal ml-2"
                >
                  <BiText value={it.result} />
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 充电习惯 */}
      <div>
        <h4 className="text-sm font-semibold mb-2">
          {renderText(L.chargingHabits)}
          <span className="ml-1 text-[11px] font-normal text-muted-foreground/70">/ {L.chargingHabits.en}</span>
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KV label={L.avgStartSoc} value={data.avgStartSoc !== undefined ? `${data.avgStartSoc}%` : "—"} />
          <KV label={L.avgEndSoc} value={data.avgEndSoc !== undefined ? `${data.avgEndSoc}%` : "—"} />
          <KV label={L.depthOfCharge} value={data.depthOfCharge !== undefined ? `${data.depthOfCharge}%` : "—"} />
          <KV label={L.fastChargeRate} value={data.fastChargingRate !== undefined ? `${data.fastChargingRate}%` : "—"} />
        </div>
      </div>

      {/* 电池基本信息 */}
      <div>
        <h4 className="text-sm font-semibold mb-2">
          {renderText(L.batteryBasicInfo)}
          <span className="ml-1 text-[11px] font-normal text-muted-foreground/70">/ {L.batteryBasicInfo.en}</span>
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KV label={L.manufacturer} value={data.manufacturer || "—"} />
          <KV label={L.batteryModel} value={data.batteryModel || "—"} />
          <KV label={L.warranty} value={data.warranty || "—"} />
          <KV label={L.powerChange} value={<BiText value={data.powerChange || "—"} />} />
          <KV label={L.fuelConsumption} value={data.fuelConsumption ? `${data.fuelConsumption} kWh` : "—"} />
          <KV label={L.energyDensity} value={data.energyDensity ? `${data.energyDensity} Wh/kg` : "—"} />
          <KV label={L.batteryWeight} value={data.batteryWeight ? `${data.batteryWeight} kg` : "—"} />
          <KV label={L.checkDate} value={data.checkDate || "—"} />
        </div>
      </div>

      {/* 90 天报警 */}
      {data.alarm90d && (data.alarm90d.l1 || data.alarm90d.l2 || data.alarm90d.l3) && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm font-medium mb-2">
            {renderText(L.alarm90d)}
            <span className="ml-1 text-[11px] font-normal text-muted-foreground/70">/ {L.alarm90d.en}</span>
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {data.alarm90d.l1 && (
              <Badge variant="outline" className="font-normal">
                {renderText(L.alarmLevel1)} / {L.alarmLevel1.en}: {data.alarm90d.l1}
              </Badge>
            )}
            {data.alarm90d.l2 && (
              <Badge variant="outline" className="font-normal">
                {renderText(L.alarmLevel2)} / {L.alarmLevel2.en}: {data.alarm90d.l2}
              </Badge>
            )}
            {data.alarm90d.l3 && (
              <Badge variant="outline" className="font-normal">
                {renderText(L.alarmLevel3)} / {L.alarmLevel3.en}: {data.alarm90d.l3}
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-3 text-xs text-amber-800 dark:text-amber-200 flex gap-2">
        <Wrench className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          {data.suggestion}
          <p className="text-[11px] opacity-80 mt-1">
            Professional advice is generated based on the detected battery indicators; please verify with a certified service center before making export decisions.
          </p>
        </span>
      </div>
    </div>
  );
}

// ─── 语言切换 ──────────────────────────────────────────────
function LangSwitch() {
  const [mode, setMode] = useState<ReportLangMode>("bilingual");
  useEffect(() => {
    setMode(getLangMode());
    return subscribeLangMode(setMode);
  }, []);
  const opts: { value: ReportLangMode; label: string }[] = [
    { value: "zh", label: "中" },
    { value: "bilingual", label: "中/EN" },
    { value: "en", label: "EN" },
  ];
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-[11px]">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setLangMode(o.value)}
          className={`px-2.5 py-1 rounded-sm transition-colors ${
            mode === o.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── 入口 ──────────────────────────────────────────────────
export function ReportScreenView({ report }: { report: SavedReport }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" />
          <span>
            {renderText(L.reportNo)}: {report.id}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>
            {renderText(L.generatedAt)}:{" "}
            {new Date(report.createdAt).toLocaleString("zh-CN", { hour12: false })}
          </span>
        </div>
        <LangSwitch />
      </div>
      {report.type === "insurance" && <InsuranceScreen data={report.data as InsuranceReport} />}
      {report.type === "mileage" && <MileageScreen data={report.data as MileageReport} />}
      {report.type === "battery" && <BatteryScreen data={report.data as BatteryReport} />}
    </div>
  );
}
