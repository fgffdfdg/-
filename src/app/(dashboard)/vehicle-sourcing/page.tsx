"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useOrg } from "@/lib/org/context";
import {
  Search, Plus, ExternalLink, Car, Eye, EyeOff, TrendingUp,
  Globe, Bookmark, MoreHorizontal, ChevronDown, AlertTriangle,
  Clock, CheckCircle2, XCircle, DollarSign, FileText,
  Loader2, Link2, RefreshCw, Trash2, Archive, ArrowUpRight,
  Calendar, MapPin, Gauge, Hash, LayoutGrid, List, Filter,
  Wrench, ClipboardCheck, Calculator, FileSpreadsheet,
} from "lucide-react";

// ─── Types ───

interface SourcePlatform {
  id: string;
  name: string;
  url: string;
  domain: string;
  icon?: string;
  type: string;
}

interface CandidateVehicle {
  id: string;
  vin?: string;
  vinStatus: string;
  brand?: string;
  series?: string;
  model?: string;
  year?: number;
  mileage?: number;
  location?: string;
  listingPrice?: number;
  estimatedPurchasePrice?: number;
  totalStatus: string;
  responsiblePersonId?: string;
  sourceCount?: number;
  customerCount?: number;
  hasUnreadChanges?: boolean;
  updatedAt: string;
  sources?: VehicleSource[];
}

interface VehicleSource {
  id: string;
  platformName: string;
  url: string;
  title?: string;
  listingPrice?: number;
  sourceStatus: string;
  isStale?: boolean;
}

interface ModelWatch {
  id: string;
  name?: string;
  brand?: string;
  series?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMin?: number;
  mileageMax?: number;
  location?: string;
  watchStatus: string;
  sampleCount: number;
  medianPrice?: number;
  created_at?: string;
}

interface ParseResult {
  success: boolean;
  status: "complete" | "partial" | "failed" | "blocked" | "needs_manual";
  statusReason: string;
  platform: string;
  domain: string;
  url: string;
  completeness: number;
  missingFields: string[];
  data: Record<string, unknown>;
  parserVersion: string;
  parsedAt: string;
}

interface MatchResult {
  level: "匹配" | "部分匹配" | "不匹配" | "信息不足";
  details: string[];
}

// ─── Status helpers ───

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_info: { label: "待补充", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  evaluating: { label: "评估中", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <Clock className="w-3.5 h-3.5" /> },
  selected: { label: "已选定", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  abandoned: { label: "已放弃", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: <XCircle className="w-3.5 h-3.5" /> },
  expired: { label: "已失效", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

const SOURCE_STATUS_MAP: Record<string, string> = {
  new_listing: "新上架",
  info_modified: "信息修改",
  reserved: "已预订",
  sold: "已售出",
  delisted: "已下架",
  link_broken: "链接失效",
  unavailable: "暂时无法访问",
};

// ─── Tab type ───

type Tab = "candidates" | "watches" | "platforms";

// ─── Default platforms ───

const DEFAULT_PLATFORMS: SourcePlatform[] = [
  { id: "default-autohome", name: "汽车之家", url: "https://www.autohome.com.cn", domain: "www.autohome.com.cn", type: "default" },
  { id: "default-dongchedi", name: "懂车帝", url: "https://www.dongchedi.com", domain: "www.dongchedi.com", type: "default" },
  { id: "default-guazi", name: "瓜子二手车", url: "https://www.guazi.com", domain: "www.guazi.com", type: "default" },
];

// ─── Main Page ───

export default function VehicleSourcingPage() {
  const { user, token } = useAuth();
  const { organization } = useOrg();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) || "candidates"
  );
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Candidate vehicles
  const [candidates, setCandidates] = useState<CandidateVehicle[]>([]);
  const [loading, setLoading] = useState(false);

  // Link parsing
  const [parseUrl, setParseUrl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showParseModal, setShowParseModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Platforms — 内置平台使用前端静态配置，不依赖 API
  const [platforms, setPlatforms] = useState<SourcePlatform[]>(DEFAULT_PLATFORMS);

  // Model watches
  const [watches, setWatches] = useState<ModelWatch[]>([]);
  const [watchDialogOpen, setWatchDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [watchError, setWatchError] = useState("");

  // Watch form
  const [watchName, setWatchName] = useState("");
  const [watchBrand, setWatchBrand] = useState("");
  const [watchSeries, setWatchSeries] = useState("");
  const [watchModel, setWatchModel] = useState("");
  const [watchYearMin, setWatchYearMin] = useState("");
  const [watchYearMax, setWatchYearMax] = useState("");
  const [watchPriceMin, setWatchPriceMin] = useState("");
  const [watchPriceMax, setWatchPriceMax] = useState("");
  const [watchMileageMin, setWatchMileageMin] = useState("");
  const [watchMileageMax, setWatchMileageMax] = useState("");
  const [watchLocation, setWatchLocation] = useState("");

  const resetWatchForm = () => {
    setWatchName(""); setWatchBrand(""); setWatchSeries(""); setWatchModel("");
    setWatchYearMin(""); setWatchYearMax(""); setWatchPriceMin(""); setWatchPriceMax("");
    setWatchMileageMin(""); setWatchMileageMax(""); setWatchLocation("");
    setWatchError("");
  };

  // ─── Load data ───

  const loadCandidates = async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ organizationId: organization.id });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/vehicle-sourcing/candidates?${params}`);
      const json = await res.json();
      if (json.success) setCandidates(json.data);
    } catch (_e) { /* ignore */ }
    setLoading(false);
  };

  // ─── Load watches ───

  const loadWatches = async () => {
    if (!organization?.id) return;
    try {
      const res = await fetch(`/api/vehicle-sourcing/model-watches?organization_id=${organization.id}&watch_status=all`);
      const json = await res.json();
      if (json.data) setWatches(json.data);
    } catch (_e) { /* ignore */ }
  };

  useEffect(() => {
    if (activeTab === "candidates") loadCandidates();
    if (activeTab === "watches") loadWatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, organization?.id, statusFilter, searchQuery]);

  // ─── Recover pending watch after login ───

  useEffect(() => {
    const raw = localStorage.getItem("pendingModelWatch");
    if (!raw) return;
    if (!user || !organization?.id) return;
    if (activeTab !== "watches") return;

    const pending = JSON.parse(raw);
    localStorage.removeItem("pendingModelWatch");

    // 恢复表单数据并打开对话框
    if (pending.name) setWatchName(pending.name);
    if (pending.brand) setWatchBrand(pending.brand);
    if (pending.series) setWatchSeries(pending.series);
    if (pending.model) setWatchModel(pending.model);
    if (pending.year_min) setWatchYearMin(String(pending.year_min));
    if (pending.year_max) setWatchYearMax(String(pending.year_max));
    if (pending.price_min) setWatchPriceMin(String(pending.price_min));
    if (pending.price_max) setWatchPriceMax(String(pending.price_max));
    if (pending.mileage_min) setWatchMileageMin(String(pending.mileage_min));
    if (pending.mileage_max) setWatchMileageMax(String(pending.mileage_max));
    if (pending.location) setWatchLocation(pending.location);

    setWatchDialogOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, organization?.id, activeTab]);

  // ─── Create watch ───

  const handleCreateWatch = async () => {
    if (!watchBrand.trim()) { setWatchError("品牌为必填项"); return; }
    if (!user) {
      // 保存表单数据到 localStorage，登录后自动恢复
      const pending = {
        name: watchName.trim() || undefined,
        brand: watchBrand.trim(),
        series: watchSeries.trim() || undefined,
        model: watchModel.trim() || undefined,
        year_min: watchYearMin ? Number(watchYearMin) : undefined,
        year_max: watchYearMax ? Number(watchYearMax) : undefined,
        price_min: watchPriceMin ? Number(watchPriceMin) : undefined,
        price_max: watchPriceMax ? Number(watchPriceMax) : undefined,
        mileage_min: watchMileageMin ? Number(watchMileageMin) : undefined,
        mileage_max: watchMileageMax ? Number(watchMileageMax) : undefined,
        location: watchLocation.trim() || undefined,
      };
      localStorage.setItem("pendingModelWatch", JSON.stringify(pending));
      router.push("/login?redirect=" + encodeURIComponent("/vehicle-sourcing?tab=watches"));
      return;
    }
    if (!organization?.id) { setWatchError("请先加入组织"); return; }

    setSubmitting(true);
    setWatchError("");
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        const res = await fetch("/api/vehicle-sourcing/model-watches", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({
            organization_id: organization.id,
            name: watchName.trim() || undefined,
            brand: watchBrand.trim(),
            series: watchSeries.trim() || undefined,
            model: watchModel.trim() || undefined,
            year_min: watchYearMin ? Number(watchYearMin) : undefined,
            year_max: watchYearMax ? Number(watchYearMax) : undefined,
            price_min: watchPriceMin ? Number(watchPriceMin) : undefined,
            price_max: watchPriceMax ? Number(watchPriceMax) : undefined,
            mileage_min: watchMileageMin ? Number(watchMileageMin) : undefined,
            mileage_max: watchMileageMax ? Number(watchMileageMax) : undefined,
            location: watchLocation.trim() || undefined,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            setWatchError(json.error || "已存在相同的关注条件");
          } else {
            setWatchError(json.error || "创建失败");
          }
          setSubmitting(false);
          return;
        }

        setWatchDialogOpen(false);
        resetWatchForm();
        await loadWatches();
        setSubmitting(false);
        return;
      } catch (_e) {
        retries++;
        if (retries > maxRetries) {
          setWatchError("网络请求失败，请检查网络后重试");
          setSubmitting(false);
        }
      }
    }
  };

  // ─── Parse link ───

  const parseStage = parsing ? "正在读取网页…" : parseResult ? (parseResult.status === "complete" ? "解析完成" : parseResult.status === "partial" ? "部分成功" : parseResult.status === "blocked" ? "网站阻止访问" : "解析失败") : "";

  const handleParseLink = async () => {
    if (!parseUrl.trim()) return;
    setParsing(true);
    setParseResult(null);
    try {
      const res = await fetch("/api/vehicle-sourcing/parse-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: parseUrl.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setParseResult(json.data);
      } else {
        setParseResult({
          success: false,
          status: "failed",
          statusReason: json.error || "解析失败",
          platform: "未知",
          domain: "",
          url: parseUrl.trim(),
          completeness: 0,
          missingFields: [],
          data: {},
          parserVersion: "",
          parsedAt: new Date().toISOString(),
        });
      }
    } catch {
      setParseResult({
        success: false,
        status: "failed",
        statusReason: "网络错误，请重试",
        platform: "未知",
        domain: "",
        url: parseUrl.trim(),
        completeness: 0,
        missingFields: [],
        data: {},
        parserVersion: "",
        parsedAt: new Date().toISOString(),
      });
    }
    setParsing(false);
  };

  // ─── Vehicle requirement matching ───

  const vehicleReq = searchParams.get("vehicleReq") || "";
  const computeMatch = (data: Record<string, unknown>): MatchResult => {
    if (!vehicleReq) return { level: "信息不足", details: ["未设置需求车型参数"] };
    const req = vehicleReq.toLowerCase();
    const brand = String(data.brand || "").toLowerCase();
    const series = String(data.series || "").toLowerCase();
    const model = String(data.model || "").toLowerCase();
    const details: string[] = [];

    if (!brand && !series && !model) {
      return { level: "信息不足", details: ["未能提取到品牌/车系/款型信息，无法比较"] };
    }

    const brandMatch = brand && req.includes(brand);
    const seriesMatch = series && req.includes(series) || req.includes(series);
    const modelMatch = model && req.includes(model) || req.includes(model);

    if (brandMatch) details.push(`品牌"${data.brand}"与需求匹配`);
    else if (brand) details.push(`品牌"${data.brand}"与需求"${vehicleReq}"不匹配`);

    if (seriesMatch) details.push(`车系匹配`);
    else if (series) details.push(`车系"${data.series}"与需求不匹配`);

    if (modelMatch) details.push(`款型匹配`);

    if (brandMatch && (seriesMatch || !series)) return { level: "匹配", details };
    if (brandMatch || seriesMatch) return { level: "部分匹配", details };
    return { level: "不匹配", details };
  };

  const matchResult = parseResult ? computeMatch(parseResult.data) : null;

  const handleSaveCandidate = async () => {
    if (!parseResult) return;
    if (!user) {
      // 保存解析结果到 localStorage，登录后恢复
      localStorage.setItem("pendingCandidate", JSON.stringify({ url: parseUrl.trim(), result: parseResult }));
      router.push("/login?redirect=" + encodeURIComponent("/vehicle-sourcing?tab=candidates"));
      return;
    }
    if (!organization?.id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vehicle-sourcing/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: organization.id,
          createdBy: user.id,
          brand: parseResult.data.brand || "",
          series: parseResult.data.series || "",
          model: parseResult.data.model || "",
          year: parseResult.data.year || null,
          mileage: parseResult.data.mileageKm || null,
          location: parseResult.data.location || "",
          listingPrice: parseResult.data.priceAmount || null,
          vin: parseResult.data.vin || "",
          sourceUrl: parseResult.url,
          sourcePlatform: parseResult.platform,
          sourceListingId: parseResult.data.sourceListingId || null,
          parserVersion: parseResult.parserVersion,
          parsedAt: parseResult.parsedAt,
          imageUrls: parseResult.data.images || [],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowParseModal(false);
        setParseUrl("");
        setParseResult(null);
        loadCandidates();
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  // ─── Render ───

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Car className="w-6 h-6 text-primary" />
            选车工作台
          </h1>
          <p className="text-muted-foreground mt-1">收录、评估和跟进候选车辆</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowParseModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Link2 className="w-4 h-4" />
            收录候选车辆
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {[
          { key: "candidates" as Tab, label: "候选车辆", icon: Car },
          { key: "watches" as Tab, label: "车型关注", icon: TrendingUp },
          { key: "platforms" as Tab, label: "车源平台", icon: Globe },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "candidates" && (
        <CandidatesTab
          candidates={candidates}
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onRefresh={loadCandidates}
        />
      )}

      {activeTab === "watches" && (
        <WatchesTab watches={watches} onOpenDialog={() => { resetWatchForm(); setWatchDialogOpen(true); }} />
      )}

      {activeTab === "platforms" && (
        <PlatformsTab platforms={platforms} />
      )}

      {/* Parse Link Modal */}
      {showParseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!parsing && !saving) { setShowParseModal(false); setParseUrl(""); setParseResult(null); } }}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-xl mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">收录候选车辆</h2>
              <button onClick={() => { setShowParseModal(false); setParseUrl(""); setParseResult(null); }} disabled={parsing || saving} className="p-1 hover:bg-muted rounded-md disabled:opacity-50">
                <XCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">粘贴外部车源平台的具体车辆链接，系统将自动解析公开信息。</p>

            {/* URL Input */}
            <div className="flex gap-2">
              <input
                type="url"
                value={parseUrl}
                onChange={(e) => { setParseUrl(e.target.value); setParseResult(null); }}
                placeholder="https://www.guazi.com/car-detail/..."
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                onKeyDown={(e) => e.key === "Enter" && handleParseLink()}
              />
              <button
                onClick={handleParseLink}
                disabled={parsing || !parseUrl.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium transition-colors min-w-[64px]"
              >
                {parsing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "解析"}
              </button>
            </div>

            {/* Parsing stage indicator */}
            {parsing && (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">正在读取网页…</p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70">正在获取并解析车辆信息，请稍候</p>
                </div>
              </div>
            )}

            {/* Parse result */}
            {parseResult && !parsing && (
              <>
                {/* Status banner */}
                <div className={`p-4 rounded-lg border ${
                  parseResult.status === "complete" ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800" :
                  parseResult.status === "partial" ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800" :
                  parseResult.status === "blocked" ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800" :
                  "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{parseResult.platform}</span>
                    <span className="text-xs text-muted-foreground">{parseResult.domain}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                      parseResult.status === "complete" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      parseResult.status === "partial" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>{parseStage}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{parseResult.statusReason}</p>
                </div>

                {/* Vehicle requirement matching */}
                {vehicleReq && matchResult && (
                  <div className={`p-3 rounded-lg border text-sm ${
                    matchResult.level === "匹配" ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800" :
                    matchResult.level === "部分匹配" ? "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800" :
                    "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800"
                  }`}>
                    <p className="font-medium text-sm mb-1">
                      需求：{vehicleReq} → {matchResult.level}
                    </p>
                    {matchResult.details.map((d, i) => (
                      <p key={i} className="text-xs text-muted-foreground">{d}</p>
                    ))}
                  </div>
                )}

                {/* Extracted fields */}
                {parseResult.status !== "failed" && parseResult.status !== "blocked" && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">解析字段</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "品牌", key: "brand" },
                        { label: "车系", key: "series" },
                        { label: "款型", key: "model" },
                        { label: "年份", key: "year" },
                        { label: "里程(km)", key: "mileageKm" },
                        { label: "价格", key: "priceAmount" },
                        { label: "所在地", key: "location" },
                        { label: "VIN", key: "vin" },
                      ].map(({ label, key }) => {
                        const val = parseResult.data[key];
                        const display = val != null && val !== "" ? String(val) : "";
                        return (
                          <div key={key} className="space-y-1">
                            <label className="text-xs text-muted-foreground">{label}</label>
                            <input
                              type="text"
                              defaultValue={display}
                              placeholder={display ? "" : "待补充"}
                              onChange={(e) => {
                                setParseResult(prev => prev ? {
                                  ...prev,
                                  data: { ...prev.data, [key]: e.target.value || null },
                                } : null);
                              }}
                              className={`w-full px-2 py-1.5 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                                display ? "border-border text-foreground" : "border-dashed border-amber-300 text-muted-foreground"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {/* Source listing ID */}
                    {parseResult.data.sourceListingId != null && (
                      <p className="text-xs text-muted-foreground">
                        车源编号：<span className="font-mono">{String(parseResult.data.sourceListingId)}</span>
                      </p>
                    )}
                    {/* Missing fields */}
                    {parseResult.missingFields.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {parseResult.missingFields.map((f) => (
                          <span key={f} className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 rounded">
                            缺少: {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Failed / blocked: retry or manual */}
                {(parseResult.status === "failed" || parseResult.status === "blocked") && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">可尝试以下操作：</p>
                    <div className="flex gap-2">
                      <button onClick={handleParseLink} className="px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted transition-colors">
                        <RefreshCw className="w-3.5 h-3.5 inline mr-1" />重新解析
                      </button>
                      <span className="text-xs text-muted-foreground self-center">或手工录入后保存</span>
                    </div>
                    {/* Manual entry fields when failed */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {[
                        { label: "品牌", key: "brand" },
                        { label: "车系", key: "series" },
                        { label: "款型", key: "model" },
                        { label: "年份", key: "year" },
                        { label: "里程(km)", key: "mileageKm" },
                        { label: "价格", key: "priceAmount" },
                        { label: "所在地", key: "location" },
                        { label: "VIN", key: "vin" },
                      ].map(({ label, key }) => (
                        <div key={key} className="space-y-1">
                          <label className="text-xs text-muted-foreground">{label}</label>
                          <input
                            type="text"
                            placeholder="手动输入"
                            onChange={(e) => {
                              setParseResult(prev => prev ? {
                                ...prev,
                                data: { ...prev.data, [key]: e.target.value || null },
                              } : null);
                            }}
                            className="w-full px-2 py-1.5 border border-dashed border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">更多收录方式：手工录入 · 批量导入</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowParseModal(false); setParseUrl(""); setParseResult(null); }}
                  disabled={saving}
                  className="px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveCandidate}
                  disabled={!parseResult || saving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存为待补充车源"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Watch Dialog */}
      {watchDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { if (!submitting) { resetWatchForm(); setWatchDialogOpen(false); } }}>
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">新建车型关注</h2>
              <button
                onClick={() => { resetWatchForm(); setWatchDialogOpen(false); }}
                disabled={submitting}
                className="p-1 hover:bg-muted rounded-md transition-colors disabled:opacity-50"
              >
                <XCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3">
              {/* 关注名称 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">关注名称 <span className="text-muted-foreground text-xs">(可选)</span></label>
                <input
                  type="text"
                  value={watchName}
                  onChange={(e) => setWatchName(e.target.value)}
                  placeholder="例如：宝马X5 2020款"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={submitting}
                />
              </div>

              {/* 品牌 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">品牌 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={watchBrand}
                  onChange={(e) => { setWatchBrand(e.target.value); setWatchError(""); }}
                  placeholder="例如：宝马"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={submitting}
                />
              </div>

              {/* 车系 + 车型 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">车系 <span className="text-muted-foreground text-xs">(可选)</span></label>
                  <input
                    type="text"
                    value={watchSeries}
                    onChange={(e) => setWatchSeries(e.target.value)}
                    placeholder="例如：X5"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">车型 <span className="text-muted-foreground text-xs">(可选)</span></label>
                  <input
                    type="text"
                    value={watchModel}
                    onChange={(e) => setWatchModel(e.target.value)}
                    placeholder="例如：xDrive40i"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* 年份范围 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">年份范围 <span className="text-muted-foreground text-xs">(可选)</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={watchYearMin}
                    onChange={(e) => setWatchYearMin(e.target.value)}
                    placeholder="最小年份"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={submitting}
                  />
                  <input
                    type="number"
                    value={watchYearMax}
                    onChange={(e) => setWatchYearMax(e.target.value)}
                    placeholder="最大年份"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* 价格范围 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">价格范围（万元） <span className="text-muted-foreground text-xs">(可选)</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={watchPriceMin}
                    onChange={(e) => setWatchPriceMin(e.target.value)}
                    placeholder="最低价格"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={submitting}
                  />
                  <input
                    type="number"
                    value={watchPriceMax}
                    onChange={(e) => setWatchPriceMax(e.target.value)}
                    placeholder="最高价格"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* 里程范围 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">里程范围（万公里） <span className="text-muted-foreground text-xs">(可选)</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={watchMileageMin}
                    onChange={(e) => setWatchMileageMin(e.target.value)}
                    placeholder="最小里程"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={submitting}
                  />
                  <input
                    type="number"
                    value={watchMileageMax}
                    onChange={(e) => setWatchMileageMax(e.target.value)}
                    placeholder="最大里程"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* 地区 */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">地区 <span className="text-muted-foreground text-xs">(可选)</span></label>
                <input
                  type="text"
                  value={watchLocation}
                  onChange={(e) => setWatchLocation(e.target.value)}
                  placeholder="例如：北京"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Error */}
            {watchError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 dark:bg-red-900/10 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">{watchError}</p>
                {!user && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    提示：请先登录，表单内容已保留。登录后将返回当前页面继续操作。
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { resetWatchForm(); setWatchDialogOpen(false); }}
                disabled={submitting}
                className="px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleCreateWatch}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Candidates Tab ───

function CandidatesTab({
  candidates, loading, searchQuery, setSearchQuery,
  statusFilter, setStatusFilter, viewMode, setViewMode, onRefresh,
}: {
  candidates: CandidateVehicle[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  viewMode: "table" | "card";
  setViewMode: (v: "table" | "card") => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索品牌、车系、VIN..."
              className="w-full pl-9 pr-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">全部状态</option>
            <option value="pending_info">待补充</option>
            <option value="evaluating">评估中</option>
            <option value="selected">已选定</option>
            <option value="abandoned">已放弃</option>
            <option value="expired">已失效</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-md">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 ${viewMode === "table" ? "bg-muted" : "hover:bg-muted"} transition-colors rounded-l-md`}
              title="表格视图"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 ${viewMode === "card" ? "bg-muted" : "hover:bg-muted"} transition-colors rounded-r-md`}
              title="卡片视图"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button onClick={onRefresh} className="p-2 hover:bg-muted rounded-md transition-colors" title="刷新">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Car className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">暂无候选车辆</h3>
          <p className="text-sm text-muted-foreground mb-4">点击「收录候选车辆」开始添加第一条车源</p>
        </div>
      ) : viewMode === "table" ? (
        <CandidateTable candidates={candidates} />
      ) : (
        <CandidateCards candidates={candidates} />
      )}
    </div>
  );
}

// ─── Candidate Table ───

function CandidateTable({ candidates }: { candidates: CandidateVehicle[] }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">车辆信息</th>
              <th className="text-left px-4 py-3 font-medium">挂牌价</th>
              <th className="text-left px-4 py-3 font-medium">来源</th>
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium">任务</th>
              <th className="text-left px-4 py-3 font-medium">客户机会</th>
              <th className="text-left px-4 py-3 font-medium">更新时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {candidates.map((cv) => {
              const status = STATUS_MAP[cv.totalStatus] || STATUS_MAP.pending_info;
              return (
                <tr key={cv.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                        <Car className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {cv.brand ? `${cv.brand} ${cv.series || ""}` : "待补充"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cv.year && `${cv.year}年`} {cv.mileage && `${(cv.mileage / 10000).toFixed(1)}万公里`}
                        </p>
                        {cv.vinStatus === "missing" && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">VIN 待补充</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {cv.listingPrice ? (
                      <span className="font-medium text-foreground">
                        ¥{(cv.listingPrice / 10000).toFixed(1)}万
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{cv.sourceCount || 0} 个平台</span>
                    {cv.hasUnreadChanges && (
                      <span className="ml-2 inline-block w-2 h-2 rounded-full bg-amber-500" title="有未读变化" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/30" title="配置查询" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/30" title="车况检测" />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/30" title="报价计算" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm">{cv.customerCount || 0} 个</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {cv.updatedAt ? new Date(cv.updatedAt).toLocaleDateString("zh-CN") : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Candidate Cards ───

function CandidateCards({ candidates }: { candidates: CandidateVehicle[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {candidates.map((cv) => {
        const status = STATUS_MAP[cv.totalStatus] || STATUS_MAP.pending_info;
        return (
          <div key={cv.id} className="border border-border rounded-lg p-4 hover:border-primary/30 transition-colors bg-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-muted rounded-md flex items-center justify-center">
                  <Car className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{cv.brand ? `${cv.brand} ${cv.series || ""}` : "待补充"}</p>
                  <p className="text-xs text-muted-foreground">{cv.year && `${cv.year}年`}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                {status.icon}
                {status.label}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">挂牌价</span>
                <span className="font-medium">{cv.listingPrice ? `¥${(cv.listingPrice / 10000).toFixed(1)}万` : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">来源平台</span>
                <span>{cv.sourceCount || 0} 个</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">客户机会</span>
                <span>{cv.customerCount || 0} 个</span>
              </div>
            </div>
            {cv.hasUnreadChanges && (
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />有未读变化
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Watches Tab ───

function WatchesTab({ watches, onOpenDialog }: { watches: ModelWatch[]; onOpenDialog: () => void }) {
  const formatTime = (ts?: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const buildSummary = (w: ModelWatch) => {
    const parts: string[] = [];
    if (w.brand) parts.push(w.brand);
    if (w.series) parts.push(w.series);
    if (w.model) parts.push(w.model);
    const range: string[] = [];
    if (w.yearMin || w.yearMax) range.push(`${w.yearMin ?? "不限"}~${w.yearMax ?? "不限"}年`);
    if (w.priceMin || w.priceMax) range.push(`${w.priceMin ?? "不限"}~${w.priceMax ?? "不限"}万`);
    if (w.mileageMin || w.mileageMax) range.push(`${w.mileageMin ?? "不限"}~${w.mileageMax ?? "不限"}万公里`);
    if (w.location) range.push(w.location);
    return { title: parts.join(" ") || "全部品牌", ranges: range.join(" | ") };
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">关注品牌、车系或车型条件，发现新上架车辆并观察价格趋势</p>

      {watches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">暂无车型关注</h3>
          <p className="text-sm text-muted-foreground mb-4">创建车型关注，系统将帮您发现符合条件的新车源</p>
          <button
            onClick={onOpenDialog}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            创建车型关注
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {watches.map((w) => {
            const { title, ranges } = buildSummary(w);
            return (
              <div key={w.id} className="border border-border rounded-lg p-4 bg-card hover:border-primary/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{w.name || title}</p>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    w.watchStatus === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" :
                    w.watchStatus === "paused" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {w.watchStatus === "active" ? "启用" : w.watchStatus === "paused" ? "暂停" : "归档"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{title}</p>
                {ranges && <p className="text-xs text-muted-foreground mb-2">{ranges}</p>}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>样本 {w.sampleCount}</span>
                  <span>{formatTime(w.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Platforms Tab ───

function PlatformsTab({ platforms }: { platforms: SourcePlatform[] }) {
  return (
    <div className="space-y-6">
      {/* Default platforms */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">常用平台</h3>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            添加车源平台
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {platforms.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border border-border rounded-lg hover:border-primary/30 hover:bg-muted/30 transition-colors group"
            >
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">{p.domain}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </div>

      {/* Saved searches placeholder */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">保存搜索</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg">
          <Bookmark className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">保存搜索功能即将上线</p>
          <p className="text-xs text-muted-foreground mt-1">您可以保存外部车源平台的搜索结果链接，方便快速打开</p>
        </div>
      </div>
    </div>
  );
}