"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Loader2, Shield, Gauge, Battery, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { getReport, deleteReport } from "@/lib/vehicle-inspection/report-client";
import type { VehicleInspectionReport } from "@/lib/vehicle-inspection/reports";
import { InsuranceReportView, MileageReportView, BatteryReportView } from "@/components/vehicle-inspection/report-views";

const REPORT_ICONS: Record<string, React.ReactNode> = {
  insurance: <Shield className="w-5 h-5" />,
  mileage: <Gauge className="w-5 h-5" />,
  battery: <Battery className="w-5 h-5" />,
};

const REPORT_TITLES: Record<string, string> = {
  insurance: "出险报告 / Insurance Claim Report",
  mileage: "里程报告 / Mileage Verification Report",
  battery: "电池健康度报告 / Battery Health Report",
};

const STATUS_MAP: Record<string, { zh: string; en: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { zh: "查询中", en: "Pending", variant: "secondary" },
  completed: { zh: "已完成", en: "Completed", variant: "default" },
  failed: { zh: "失败", en: "Failed", variant: "destructive" },
};

export default function ReportDetailPage(props: { params: Promise<{ id: string; reportId: string }> }) {
  const params = use(props.params);
  const { id, reportId } = params;
  const router = useRouter();
  const { token } = useAuth();
  const [report, setReport] = useState<VehicleInspectionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getReport(token, reportId);
      setReport(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDelete = async () => {
    if (!token || !confirm("确定删除此报告？/ Delete this report?")) return;
    setDeleting(true);
    try {
      await deleteReport(token, reportId);
      router.push(`/car-inventory/${id}`);
    } catch (e) {
      alert("删除失败：" + (e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // ------- 加载态 -------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">加载中 / Loading...</span>
        </div>
      </div>
    );
  }

  // ------- 错误态 -------
  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <p className="text-muted-foreground text-sm">{error || "报告不存在 / Report not found"}</p>
        <Button variant="outline" onClick={() => router.push(`/car-inventory/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回车辆详情 / Back
        </Button>
      </div>
    );
  }

  const reportType = report.reportType as string;
  const status = STATUS_MAP[report.status] ?? { zh: report.status, en: report.status, variant: "outline" as const };
  const icon = REPORT_ICONS[reportType] ?? <FileText className="w-5 h-5" />;
  const title = REPORT_TITLES[reportType] ?? `${reportType} 报告 / Report`;
  const reportData = (report.reportData as Record<string, unknown>) ?? {};

  return (
    <>
      {/* 打印专用 CSS */}
      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          .no-print, nav, .sidebar, header[role="banner"] { display: none !important; }
          .print-area { padding: 0 !important; margin: 0 !important; max-width: 100% !important; box-shadow: none !important; }
          .print-area .bg-card { background: #fff !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="print-area max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 顶部操作栏 */}
        <div className="no-print flex items-center justify-between flex-wrap gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/car-inventory/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回车辆详情 / Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Download className="w-4 h-4 mr-2" />
              下载 PDF / Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? "删除中..." : "删除 / Delete"}
            </Button>
          </div>
        </div>

        {/* 报告标题区 */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                报告编号 / Report ID: {report.id}<span className="mx-2">|</span>生成时间 / Created: {new Date(report.createdAt).toLocaleString('zh-CN')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Badge variant={status.variant}>{status.zh} / {status.en}</Badge>
            {report.errorMessage && (
              <span className="text-sm text-destructive">{report.errorMessage}</span>
            )}
          </div>
        </div>

        {/* 报告内容 */}
        {report.status === "completed" && (
          <>
            {reportType === "insurance" && <InsuranceReportView data={reportData} />}
            {reportType === "mileage" && <MileageReportView data={reportData} />}
            {reportType === "battery" && <BatteryReportView data={reportData} />}
          </>
        )}

        {/* 失败/未完成 */}
        {report.status !== "completed" && (
          <div className="bg-card rounded-lg border border-border p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              {report.status === "pending" ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-destructive" />
              )}
            </div>
            <p className="text-muted-foreground">
              {report.status === "pending"
                ? "报告处理中 / Report is being processed..."
                : report.errorMessage || "报告生成失败 / Report generation failed"}
            </p>
            {report.status === "pending" && (
              <Button variant="outline" size="sm" className="mt-4" onClick={fetchReport}>
                刷新 / Refresh
              </Button>
            )}
          </div>
        )}

        {/* 原始数据（调试用，打印时隐藏） */}
        <details className="no-print mt-6">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            原始数据 / Raw Data
          </summary>
          <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-64">
            {JSON.stringify(reportData, null, 2)}
          </pre>
        </details>
      </div>
    </>
  );
}