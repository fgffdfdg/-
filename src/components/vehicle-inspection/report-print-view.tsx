"use client";

import { useEffect, useRef, useState } from "react";
import {
  BatteryReport,
  InsuranceReport,
  MileageReport,
  ReportType,
  SavedReport,
  VehicleBaseInfo,
} from "@/lib/vehicle-inspection/types";
import {
  L,
  getLangMode,
  renderText,
  setLangMode,
  subscribeLangMode,
  transEnum,
  type BiPair,
  type ReportLangMode,
} from "@/lib/vehicle-inspection/i18n";

interface ReportPrintViewProps {
  report: SavedReport;
  /** 触发打印的注册函数，父组件拿到后绑定到按钮 */
  registerPrint?: (fn: () => void) => void;
}

function formatMoney(n: number): string {
  return `¥${n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

/** 双语标签：中文主，英文灰色小字 */
function BiLabel({ pair, className = "" }: { pair: BiPair; className?: string }) {
  return (
    <div className={`bi-label ${className}`}>
      <span className="bi-label-zh">{pair.zh}</span>
      <span className="bi-label-sep"> / </span>
      <span className="bi-label-en">{pair.en}</span>
    </div>
  );
}

/** 双语文本值（枚举） */
function BiVal({ value }: { value: string | null | undefined }) {
  const t = transEnum(value);
  if (!t) return <>{value ?? "—"}</>;
  return (
    <>
      {t.zh}
      {t.en !== t.zh && <span className="bi-val-en"> / {t.en}</span>}
    </>
  );
}

/** 表头：中文主，英文小字辅助 */
function BiTh({ pair, width, num }: { pair: BiPair; width?: string; num?: boolean }) {
  return (
    <th style={{ width }} className={num ? "num" : undefined}>
      <div>{pair.zh}</div>
      <div className="bi-th-en">{pair.en}</div>
    </th>
  );
}

// ─── 公共头 ────────────────────────────────────────────────
function ReportHeader({ vehicle, type }: { vehicle: VehicleBaseInfo; type: ReportType }) {
  const titleMap: Record<ReportType, BiPair> = {
    insurance: L.titleInsurance,
    mileage: L.titleMileage,
    battery: L.titleBattery,
  };
  const t = titleMap[type];
  const modelLine = [vehicle.brand, vehicle.series, vehicle.modelName, vehicle.year && `${vehicle.year}款`]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="report-header">
      <div className="report-brand">
        <div>
          <div className="report-brand-name">ExportDrive</div>
          <div className="report-brand-sub-zh">{renderText(L.serviceSubtitle)}</div>
          <div className="report-brand-sub-en">{L.serviceSubtitle.en}</div>
        </div>
        <div className="report-brand-title">
          <div className="report-title-zh">{t.zh}</div>
          <div className="report-title-en">{t.en}</div>
        </div>
      </div>
      <div className="report-vehicle">
        <div><BiLabel pair={L.vin} /><b>{vehicle.vin}</b></div>
        {vehicle.plateNumber && (
          <div><BiLabel pair={L.plateNumber} /><b>{vehicle.plateNumber}</b></div>
        )}
        {modelLine && (
          <div className="report-vehicle-model"><BiLabel pair={L.brandModel} /><b>{modelLine}</b></div>
        )}
      </div>
    </div>
  );
}

// ─── 出险报告 ──────────────────────────────────────────────
function InsuranceSection({ data }: { data: InsuranceReport }) {
  return (
    <div>
      <div className="summary-grid">
        <div className="summary-item">
          <BiLabel pair={L.claimCount} />
          <div className="summary-value">{data.claimCount} <span className="bi-unit">claims</span></div>
        </div>
        <div className="summary-item">
          <BiLabel pair={L.totalPayout} />
          <div className="summary-value">{formatMoney(data.totalAmount)}</div>
        </div>
        <div className="summary-item">
          <BiLabel pair={L.lastClaim} />
          <div className="summary-value">{data.lastClaimDate ?? "—"}</div>
        </div>
        <div className={`summary-item ${data.hasMajorAccident ? "summary-danger" : "summary-ok"}`}>
          <BiLabel pair={L.majorAccident} />
          <div className="summary-value">
            <BiVal value={data.hasMajorAccident ? "存在" : "无"} />
          </div>
        </div>
      </div>

      <h3 className="section-title">
        <span>{renderText(L.claimDetails)}</span>
        <span className="section-title-en">{L.claimDetails.en}</span>
      </h3>
      {data.records.length === 0 ? (
        <div className="empty-line">
          <div>{renderText(L.noClaimRecords)}</div>
          <div className="empty-line-en">{L.noClaimRecords.en}</div>
        </div>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <BiTh pair={L.claimDate} width="14%" />
              <BiTh pair={L.accidentType} width="16%" />
              <BiTh pair={L.damagePart} width="22%" />
              <BiTh pair={L.claimLocation} width="22%" />
              <BiTh pair={L.payout} width="14%" num />
              <BiTh pair={L.status} width="12%" />
            </tr>
          </thead>
          <tbody>
            {data.records.map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td>
                <td><BiVal value={r.type} /></td>
                <td>{r.damage}</td>
                <td>{r.location ?? "—"}</td>
                <td className="num">{formatMoney(r.amount)}</td>
                <td><BiVal value={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── 里程报告 ──────────────────────────────────────────────
function MileageSection({ data }: { data: MileageReport }) {
  const riskPair =
    data.riskLevel === "high" ? L.riskHigh : data.riskLevel === "medium" ? L.riskMedium : L.riskLow;
  return (
    <div>
      <div className="summary-grid">
        <div className="summary-item">
          <BiLabel pair={L.currentMileage} />
          <div className="summary-value">{data.currentMileage.toLocaleString()} km</div>
        </div>
        <div className="summary-item">
          <BiLabel pair={L.annualAvg} />
          <div className="summary-value">{data.annualAverage.toLocaleString()} km</div>
        </div>
        <div className="summary-item">
          <BiLabel pair={L.latestRecord} />
          <div className="summary-value">{data.lastRecordDate}</div>
        </div>
        <div className={`summary-item ${data.tamperRisk ? "summary-danger" : "summary-ok"}`}>
          <BiLabel pair={L.tamperRisk} />
          <div className="summary-value">
            {riskPair.zh}
            <span className="bi-val-en"> / {riskPair.en}</span>
          </div>
        </div>
      </div>

      <h3 className="section-title">
        <span>{renderText(L.mileageCheckpoints)}</span>
        <span className="section-title-en">{L.mileageCheckpoints.en}</span>
      </h3>
      <table className="report-table">
        <thead>
          <tr>
            <BiTh pair={L.recordDate} width="22%" />
            <BiTh pair={L.mileageReading} width="20%" num />
            <BiTh pair={L.dataSourceField} width="22%" />
            <BiTh pair={L.remark} />
          </tr>
        </thead>
        <tbody>
          {data.checkpoints.map((c, i) => {
            const prev = data.checkpoints[i - 1];
            const anomaly = prev && c.mileage < prev.mileage;
            return (
              <tr key={i} className={anomaly ? "row-danger" : ""}>
                <td>{c.date}</td>
                <td className="num">{c.mileage.toLocaleString()}</td>
                <td><BiVal value={c.source} /></td>
                <td>
                  {anomaly ? (
                    <>
                      <div>{renderText(L.suspectedRollback)}</div>
                      <div className="bi-row-en">{L.suspectedRollback.en}</div>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className={`suggestion ${data.tamperRisk ? "suggestion-danger" : "suggestion-ok"}`}>
        <span className="suggestion-zh">{data.tamperRisk ? renderText(L.rollbackDetected) : renderText(L.noRollback)}</span>
        <span className="suggestion-en">{data.tamperRisk ? L.rollbackDetected.en : L.noRollback.en}</span>
      </p>
    </div>
  );
}

// ─── 电池报告 ──────────────────────────────────────────────
function BatterySection({ data }: { data: BatteryReport }) {
  const scores: Array<[BiPair, number | undefined]> = [
    [L.healthScore, data.healthScore],
    [L.capacityScore, data.capacityScore],
    [L.tempConsistency, data.temperatureScore],
    [L.voltageConsistency, data.voltageScore],
    [L.irConsistency, data.internalResistanceScore],
    [L.selfDischarge, data.isolationScore],
  ];
  return (
    <div>
      <div className="summary-grid summary-grid-3">
        <div className="summary-item">
          <BiLabel pair={L.soh} />
          <div className="summary-value">{data.soh}%</div>
        </div>
        <div className="summary-item">
          <BiLabel pair={L.overallGrade} />
          <div className="summary-value">
            <BiVal value={data.grade} />
            {data.rawGrade && data.rawGrade !== data.grade ? ` (${data.rawGrade})` : ""}
          </div>
        </div>
        <div className="summary-item">
          <BiLabel pair={L.batteryType} />
          <div className="summary-value"><BiVal value={data.batteryType || "—"} /></div>
        </div>
        <div className="summary-item">
          <BiLabel pair={L.engineType} />
          <div className="summary-value"><BiVal value={data.engineType || "—"} /></div>
        </div>
        <div className="summary-item">
          <BiLabel pair={L.fullEndurance} />
          <div className="summary-value">{data.fullEndurance ? `${data.fullEndurance} km` : "—"}</div>
        </div>
        <div className="summary-item">
          <BiLabel pair={L.nominalEnergy} />
          <div className="summary-value">{data.nominalEnergy ? `${data.nominalEnergy} kWh` : "—"}</div>
        </div>
        <div className="summary-item">
          <BiLabel pair={L.currentCapacity} />
          <div className="summary-value">{data.currentCapacity > 0 ? `${data.currentCapacity} Ah` : "—"}</div>
        </div>
        <div className="summary-item">
          <BiLabel pair={L.totalMileage} />
          <div className="summary-value">{data.totalMileage ? `${data.totalMileage.toLocaleString()} km` : "—"}</div>
        </div>
        <div className="summary-item">
          <BiLabel pair={L.degradationRate} />
          <div className="summary-value">
            {data.degradationRate !== undefined ? `${data.degradationRate}%/yr` : "—"}
          </div>
        </div>
      </div>

      <h3 className="section-title">
        <span>{renderText(L.consistencyScores)}</span>
        <span className="section-title-en">{L.consistencyScores.en}</span>
      </h3>
      <table className="report-table">
        <thead>
          <tr>{scores.map(([pair]) => <BiTh key={pair.zh} pair={pair} />)}</tr>
        </thead>
        <tbody>
          <tr>
            {scores.map(([pair, v]) => (
              <td key={pair.zh} className="num">{v !== undefined ? v : "—"}</td>
            ))}
          </tr>
        </tbody>
      </table>

      {data.cellGroups.length > 0 && (
        <>
          <h3 className="section-title">
            <span>{renderText(L.keyCellMetrics)}</span>
            <span className="section-title-en">{L.keyCellMetrics.en}</span>
          </h3>
          <table className="report-table">
            <thead>
              <tr>
                <th><div>电芯组</div><div className="bi-th-en">Cell Group</div></th>
                <th className="num"><div>电压</div><div className="bi-th-en">Voltage (V)</div></th>
                <th className="num"><div>温度</div><div className="bi-th-en">Temp (℃)</div></th>
                <th className="num"><div>{renderText(L.score)}</div><div className="bi-th-en">{L.score.en}</div></th>
              </tr>
            </thead>
            <tbody>
              {data.cellGroups.map((g, i) => (
                <tr key={i}>
                  <td>{g.name}</td>
                  <td className="num">{g.voltage > 0 ? g.voltage.toFixed(2) : "—"}</td>
                  <td className="num">{g.temperature > 0 ? g.temperature.toFixed(1) : "—"}</td>
                  <td className="num">{g.soh || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {data.annualInspections && data.annualInspections.length > 0 && (
        <>
          <h3 className="section-title">
            <span>{renderText(L.annualInspection)}</span>
            <span className="section-title-en">{L.annualInspection.en}</span>
          </h3>
          <table className="report-table">
            <thead>
              <tr>
                <BiTh pair={L.inspectionItem} />
                <BiTh pair={L.standard} />
                <BiTh pair={L.measured} num />
                <BiTh pair={L.conclusion} />
              </tr>
            </thead>
            <tbody>
              {data.annualInspections.map((it, i) => (
                <tr key={i}>
                  <td>{it.name}</td>
                  <td>{it.standard}</td>
                  <td className="num">{it.ownValue}</td>
                  <td><BiVal value={it.result} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {data.evaluations && data.evaluations.length > 0 && (
        <>
          <h3 className="section-title">
            <span>{renderText(L.consistencyCompare)}</span>
            <span className="section-title-en">{L.consistencyCompare.en}</span>
          </h3>
          <table className="report-table">
            <thead>
              <tr>
                <th><div>指标</div><div className="bi-th-en">Metric</div></th>
                <BiTh pair={L.vehicleValue} num />
                <BiTh pair={L.peerAverage} num />
                <BiTh pair={L.evaluation} />
              </tr>
            </thead>
            <tbody>
              {data.evaluations.map((it, i) => (
                <tr key={i}>
                  <td>{it.name}</td>
                  <td className="num">{it.ownData}</td>
                  <td className="num">{it.otherData}</td>
                  <td><BiVal value={it.result} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3 className="section-title">
        <span>{renderText(L.chargingHabits)}</span>
        <span className="section-title-en">{L.chargingHabits.en}</span>
      </h3>
      <table className="report-table">
        <tbody>
          <tr>
            <th style={{ width: "22%" }}><BiLabel pair={L.avgStartSoc} /></th>
            <td>{data.avgStartSoc !== undefined ? `${data.avgStartSoc}%` : "—"}</td>
            <th style={{ width: "22%" }}><BiLabel pair={L.avgEndSoc} /></th>
            <td>{data.avgEndSoc !== undefined ? `${data.avgEndSoc}%` : "—"}</td>
          </tr>
          <tr>
            <th><BiLabel pair={L.depthOfCharge} /></th>
            <td>{data.depthOfCharge !== undefined ? `${data.depthOfCharge}%` : "—"}</td>
            <th><BiLabel pair={L.fastChargeRate} /></th>
            <td>{data.fastChargingRate !== undefined ? `${data.fastChargingRate}%` : "—"}</td>
          </tr>
        </tbody>
      </table>

      <h3 className="section-title">
        <span>{renderText(L.batteryBasicInfo)}</span>
        <span className="section-title-en">{L.batteryBasicInfo.en}</span>
      </h3>
      <table className="report-table">
        <tbody>
          <tr>
            <th style={{ width: "18%" }}><BiLabel pair={L.manufacturer} /></th>
            <td>{data.manufacturer || "—"}</td>
            <th style={{ width: "18%" }}><BiLabel pair={L.batteryModel} /></th>
            <td>{data.batteryModel || "—"}</td>
          </tr>
          <tr>
            <th><BiLabel pair={L.warranty} /></th>
            <td>{data.warranty || "—"}</td>
            <th><BiLabel pair={L.powerChange} /></th>
            <td><BiVal value={data.powerChange || "—"} /></td>
          </tr>
          <tr>
            <th><BiLabel pair={L.fuelConsumption} /></th>
            <td>{data.fuelConsumption ? `${data.fuelConsumption} kWh` : "—"}</td>
            <th><BiLabel pair={L.energyDensity} /></th>
            <td>{data.energyDensity ? `${data.energyDensity} Wh/kg` : "—"}</td>
          </tr>
          <tr>
            <th><BiLabel pair={L.batteryWeight} /></th>
            <td>{data.batteryWeight ? `${data.batteryWeight} kg` : "—"}</td>
            <th><BiLabel pair={L.checkDate} /></th>
            <td>{data.checkDate || "—"}</td>
          </tr>
        </tbody>
      </table>

      {data.batteryValuation ? (
        <div className="summary-grid" style={{ marginTop: 8 }}>
          <div className="summary-item">
            <BiLabel pair={L.batteryValuation} />
            <div className="summary-value">¥{data.batteryValuation.toLocaleString()}</div>
          </div>
          {data.nominalEndurance ? (
            <div className="summary-item">
              <BiLabel pair={L.nominalEndurance} />
              <div className="summary-value">{data.nominalEndurance} km</div>
            </div>
          ) : null}
          {data.totalMileageDate ? (
            <div className="summary-item">
              <BiLabel pair={L.mileageDate} />
              <div className="summary-value">{data.totalMileageDate}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      <h3 className="section-title">
        <span>{renderText(L.professionalAdvice)}</span>
        <span className="section-title-en">{L.professionalAdvice.en}</span>
      </h3>
      <p className="suggestion">
        <span className="suggestion-zh">{data.suggestion}</span>
        <span className="suggestion-en">
          Professional advice is generated based on the detected battery indicators; please verify with a certified service center before making export decisions.
        </span>
      </p>
    </div>
  );
}

// ─── 主组件 ────────────────────────────────────────────────
export function ReportPrintView({ report, registerPrint }: ReportPrintViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!registerPrint) return;
    const handler = () => {
      const node = ref.current;
      if (!node) return;
      // 打开新窗口打印，确保只打印报告内容，且加载本页样式
      const win = window.open("", "_blank", "width=900,height=1200");
      if (!win) {
        // 弹窗被拦截时，退化为整页打印
        window.print();
        return;
      }
      const styles = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel='stylesheet'], style"))
        .map((el) => el.outerHTML)
        .join("\n");
      win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${report.type}-report</title>${styles}<style>
        @page { size: A4; margin: 16mm 14mm; }
        body { margin: 0; background: #fff; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Inter", sans-serif; }
        .report-print { max-width: 780px; margin: 0 auto; padding: 8px 4px 40px; font-size: 12px; color: #0f172a; }
        .report-header { border-bottom: 3px double #0c2d48; padding-bottom: 12px; margin-bottom: 18px; }
        .report-brand { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .report-brand-name { font-size: 16px; font-weight: 700; color: #0c2d48; letter-spacing: 0.5px; }
        .report-brand-sub-zh { font-size: 11px; color: #334155; margin-top: 2px; }
        .report-brand-sub-en { font-size: 10px; color: #64748b; }
        .report-brand-title { text-align: right; }
        .report-title-zh { font-size: 18px; font-weight: 700; color: #0c2d48; }
        .report-title-en { font-size: 11px; color: #64748b; margin-top: 2px; letter-spacing: 0.3px; }
        .report-vehicle { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; font-size: 11px; color: #334155; margin-top: 10px; }
        .report-vehicle > div { display: flex; align-items: baseline; gap: 6px; }
        .report-vehicle-model { grid-column: 1 / -1; }
        .report-vehicle b { color: #0f172a; font-weight: 600; word-break: break-all; }
        .bi-label { display: inline; }
        .bi-label-zh { color: #475569; }
        .bi-label-sep { color: #94a3b8; }
        .bi-label-en { color: #94a3b8; font-size: 10px; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
        .summary-grid-3 { grid-template-columns: repeat(3, 1fr); }
        .summary-item { border: 1px solid #e2e8f0; padding: 8px 10px; border-radius: 4px; background: #f8fafc; }
        .summary-item .bi-label { font-size: 10px; line-height: 1.3; }
        .summary-value { font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 4px; }
        .bi-unit { font-size: 10px; font-weight: 400; color: #64748b; }
        .summary-ok .summary-value { color: #16a34a; }
        .summary-danger .summary-value { color: #dc2626; }
        .section-title { font-size: 13px; font-weight: 600; color: #0c2d48; margin: 16px 0 8px; padding-left: 8px; border-left: 3px solid #e67e22; display: flex; align-items: baseline; gap: 8px; }
        .section-title-en { font-size: 10px; font-weight: 400; color: #64748b; letter-spacing: 0.3px; }
        .report-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .report-table th, .report-table td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
        .report-table th { background: #f1f5f9; font-weight: 600; color: #334155; vertical-align: middle; }
        .report-table th .bi-th-en { font-size: 9px; font-weight: 400; color: #94a3b8; margin-top: 1px; }
        .report-table td.num, .report-table th.num { text-align: right; font-variant-numeric: tabular-nums; }
        .bi-val-en, .bi-row-en { color: #64748b; font-size: 10px; }
        .bi-row-en { display: block; margin-top: 2px; }
        .row-danger td { background: #fef2f2; color: #b91c1c; }
        .empty-line { color: #475569; font-size: 11px; padding: 12px; text-align: center; border: 1px dashed #cbd5e1; border-radius: 4px; }
        .empty-line-en { color: #94a3b8; font-size: 10px; margin-top: 2px; }
        .suggestion { margin: 10px 0 0; padding: 10px 12px; background: #fff7ed; border-left: 3px solid #e67e22; color: #7c2d12; font-size: 11px; line-height: 1.6; border-radius: 2px; }
        .suggestion-ok { background: #f0fdf4; border-left-color: #16a34a; color: #14532d; }
        .suggestion-danger { background: #fef2f2; border-left-color: #dc2626; color: #7f1d1d; }
        .suggestion-en { display: block; color: inherit; opacity: 0.75; font-size: 10px; margin-top: 4px; }
        .report-footer { margin-top: 24px; padding-top: 12px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 10px; color: #94a3b8; }
        .report-footer .ft-en { color: #cbd5e1; margin-left: 4px; }
      </style></head><body>${node.outerHTML}</body></html>`);
      win.document.close();
      win.focus();
      // 等待样式加载
      setTimeout(() => {
        win.print();
      }, 300);
    };
    registerPrint(handler);
    return () => registerPrint(() => {});
  }, [registerPrint, report]);

  return (
    <div ref={ref} className="report-print">
      <ReportHeader vehicle={report.vehicle} type={report.type} />
      {report.type === "insurance" && <InsuranceSection data={report.data as InsuranceReport} />}
      {report.type === "mileage" && <MileageSection data={report.data as MileageReport} />}
      {report.type === "battery" && <BatterySection data={report.data as BatteryReport} />}
      <div className="report-footer">
        <span>{renderText(L.reportNo)}<span className="ft-en">{L.reportNo.en}</span>: {report.id}</span>
        <span>{renderText(L.generatedAt)}<span className="ft-en">{L.generatedAt.en}</span>: {formatDate(report.createdAt)}</span>
        <span>{renderText(L.dataSource)}<span className="ft-en">{L.dataSource.en}</span>: {renderText(L.exportDrive)}</span>
      </div>
    </div>
  );
}
