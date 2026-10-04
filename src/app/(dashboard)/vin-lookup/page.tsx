"use client";

import { useState } from "react";
import { Search, Printer, Car, AlertCircle, FileText, Languages, Settings, Ruler, Info, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface VinData {
  vin?: string;
  brand?: string;
  typename?: string;
  groupname?: string;
  group_code?: string;
  name?: string;
  yeartype?: string;
  price?: string;
  gearbox?: string;
  enginemodel?: string;
  drivemode?: string;
  displacement?: string;
  environmentalstandards?: string;
  sizetype?: string;
  bodytype?: string;
  seatnum?: string;
  listdate?: string;
  stop_date?: string;
  sale_state?: string;
  len?: string;
  width?: string;
  height?: string;
  wheelbase?: string;
  weight?: string;
  full_weight_max?: string;
  axes_num?: string;
  track_front?: string;
  track_rear?: string;
  fueltype?: string;
  fuelgrade?: string;
  fuelmethod?: string;
  maxpower?: string;
  manufacturer?: string;
  model?: string;
  color?: string;
  remark?: string;
}

export default function VinLookupPage() {
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VinData | null>(null);
  const [error, setError] = useState("");
  const [translatedData, setTranslatedData] = useState<Record<string, any> | null>(null);
  const [translating, setTranslating] = useState(false);

  const handleQuery = async () => {
    if (!vin.trim()) {
      toast.error("请输入 VIN 码");
      return;
    }
    if (vin.trim().length !== 17) {
      toast.error("VIN 码必须为 17 位");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      console.log("[VIN] 开始查询:", vin.trim());
      const res = await fetch(`/api/vehicle-inspection/vin-lookup?vin=${encodeURIComponent(vin.trim())}`);
      const json = await res.json();
      console.log("[VIN] API 响应:", res.status, json);

      if (!res.ok) {
        const errorMsg = json.error || "查询失败，请稍后重试";
        console.error("[VIN] 查询失败:", errorMsg);
        setError(errorMsg);
        toast.error("查询失败，请重试");
        return;
      }

      if (json.success && json.data) {
        console.log("[VIN] 查询成功:", json.data.brand, json.data.name);
        setResult(json.data);
        setError("");
        toast.success("车型识别成功");
      } else {
        const errorMsg = json.error || json.msg || "未找到匹配的车型信息";
        console.warn("[VIN] 无数据:", errorMsg);
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "网络错误，请重试";
      console.error("[VIN] 异常:", err);
      setError(errorMsg);
      toast.error("网络异常，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setVin("");
    setResult(null);
    setError("");
    setTranslatedData(null);
  };

  const handleTranslate = async () => {
    if (!result) return;

    setTranslating(true);
    try {
      const res = await fetch("/api/vehicle-inspection/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: result }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error("翻译失败，请稍后重试");
        return;
      }

      setTranslatedData(json.data);
      toast.success("英文参数表生成成功");
    } catch (err) {
      console.error("[Translate] 异常:", err);
      toast.error("网络异常，请重试");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">
          汽车参数查询
          {translatedData && (
            <Badge variant="secondary" className="ml-2 align-middle">Vehicle Spec Lookup</Badge>
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          输入 VIN 码查询车辆完整参数信息，支持英文参数表生成与打印
          {translatedData && (
            <span className="ml-1 text-muted-foreground/70">
              — Enter a VIN to retrieve full vehicle specifications, with English spec sheet generation and printing.
            </span>
          )}
        </p>
      </div>

      {/* Query Section */}
      <div className="rounded-xl border border-border bg-card p-4 print:hidden">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Input
              placeholder="输入 17 位 VIN 码，如 LFV3A28W2R3638401"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              maxLength={17}
              className="font-mono text-base h-10 pr-16"
              onKeyDown={(e) => e.key === "Enter" && handleQuery()}
            />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${vin.length === 17 ? 'text-success' : 'text-muted-foreground/50'}`}>
              {vin.length}/17
            </span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleQuery} disabled={loading || vin.length < 17} className="h-10 px-5">
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  查询中...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  查询
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset} className="h-10 px-4">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {error && (
          <Alert variant="destructive" className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>查询失败</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 h-7 text-xs"
                onClick={handleQuery}
                disabled={loading}
              >
                {loading ? "重试中..." : "重新查询"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Result Section */}
      {result && (
        <>
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 print:hidden">
            <Button variant="outline" onClick={handleTranslate} disabled={translating}>
              {translating ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  翻译中...
                </>
              ) : (
                <>
                  <Languages className="h-4 w-4 mr-2" />
                  生成英文参数表
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              打印参数报告
            </Button>
          </div>

          {/* Printable Report */}
          <div className="bg-white rounded-lg border print:border-0 print:shadow-none">
            {/* Report Header */}
            <div className="p-6 border-b bg-muted/30 print:bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Car className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">
                      {result.brand} {result.typename}
                      {translatedData?.Brand ? ` · ${translatedData.Brand}` : ""}
                      {translatedData?.["Model Series"] ? ` ${translatedData["Model Series"]}` : ""}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {result.name}
                      {translatedData?.Model ? ` — ${translatedData.Model}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    VIN {translatedData ? "" : ""}
                    {translatedData && <span className="text-muted-foreground/70 ml-1">(Vehicle Identification Number)</span>}
                  </div>
                  <div className="font-mono text-sm font-medium">{result.vin}</div>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="p-6 border-b">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                基本信息
                {translatedData && <span className="text-sm font-normal text-muted-foreground/70">Basic Information</span>}
                {translatedData && <Badge variant="secondary" className="ml-auto">EN</Badge>}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem label="品牌" enLabel="Brand" value={result.brand} enValue={translatedData?.Brand} />
                <InfoItem label="车系" enLabel="Model Series" value={result.typename} enValue={translatedData?.["Model Series"]} />
                <InfoItem label="车型名称" enLabel="Model" value={result.name} span={2} enValue={translatedData?.Model} />
                <InfoItem label="年款" enLabel="Year" value={result.yeartype} enValue={translatedData?.Year} />
                <InfoItem label="厂商" enLabel="Manufacturer" value={result.manufacturer} enValue={translatedData?.Manufacturer} />
                <InfoItem label="车辆型号" enLabel="Vehicle Model" value={result.model} enValue={translatedData?.["Vehicle Model"]} />
                <InfoItem label="车辆级别" enLabel="Vehicle Class" value={result.sizetype} enValue={translatedData?.["Vehicle Class"]} />
                <InfoItem label="车身颜色" enLabel="Color" value={result.color} enValue={translatedData?.Color} />
                <InfoItem label="是否在售" enLabel="On Sale" value={result.sale_state} enValue={translatedData?.["On Sale"]} />
                <InfoItem label="指导价(元)" enLabel="MSRP" value={result.price} enValue={translatedData?.MSRP} />
                <InfoItem label="上市日期" enLabel="Launch Date" value={result.listdate} enValue={translatedData?.["Launch Date"]} />
                <InfoItem label="停产日期" enLabel="Stop Date" value={result.stop_date} enValue={translatedData?.["Stop Date"]} />
              </div>
            </div>

            {/* Powertrain */}
            <div className="p-6 border-b">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                动力参数
                {translatedData && <span className="text-sm font-normal text-muted-foreground/70">Powertrain</span>}
                {translatedData && <Badge variant="secondary" className="ml-auto">EN</Badge>}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem label="燃料种类" enLabel="Fuel Type" value={result.fueltype} enValue={translatedData?.["Fuel Type"]} />
                <InfoItem label="燃料标号" enLabel="Fuel Grade" value={result.fuelgrade} enValue={translatedData?.["Fuel Grade"]} />
                <InfoItem label="排量" enLabel="Displacement" value={result.displacement} enValue={translatedData?.Displacement} />
                <InfoItem label="排放标准" enLabel="Emission Standard" value={result.environmentalstandards} enValue={translatedData?.["Emission Standard"]} />
                <InfoItem label="发动机型号" enLabel="Engine Model" value={result.enginemodel} enValue={translatedData?.["Engine Model"]} />
                <InfoItem label="最大功率(kW)" enLabel="Max Power" value={result.maxpower} enValue={translatedData?.["Max Power"]} />
                <InfoItem label="燃油喷射形式" enLabel="Fuel Injection" value={result.fuelmethod} enValue={translatedData?.["Fuel Injection"]} />
                <InfoItem label="驱动方式" enLabel="Drive Type" value={result.drivemode} enValue={translatedData?.["Drive Type"]} />
              </div>
            </div>

            {/* Transmission */}
            <div className="p-6 border-b">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                变速箱
                {translatedData && <span className="text-sm font-normal text-muted-foreground/70">Transmission</span>}
                {translatedData && <Badge variant="secondary" className="ml-auto">EN</Badge>}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem label="变速箱类型" enLabel="Transmission" value={result.gearbox} enValue={translatedData?.Transmission} />
              </div>
            </div>

            {/* Dimensions */}
            <div className="p-6 border-b">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Ruler className="h-4 w-4 text-primary" />
                车身尺寸与质量
                {translatedData && <span className="text-sm font-normal text-muted-foreground/70">Dimensions &amp; Weight</span>}
                {translatedData && <Badge variant="secondary" className="ml-auto">EN</Badge>}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem label="长度(mm)" enLabel="Length" value={result.len} enValue={translatedData?.Length} />
                <InfoItem label="宽度(mm)" enLabel="Width" value={result.width} enValue={translatedData?.Width} />
                <InfoItem label="高度(mm)" enLabel="Height" value={result.height} enValue={translatedData?.Height} />
                <InfoItem label="轴距(mm)" enLabel="Wheel Base" value={result.wheelbase} enValue={translatedData?.["Wheel Base"]} />
                <InfoItem label="前轮距(mm)" enLabel="Front Track" value={result.track_front} enValue={translatedData?.["Front Track"]} />
                <InfoItem label="后轮距(mm)" enLabel="Rear Track" value={result.track_rear} enValue={translatedData?.["Rear Track"]} />
                <InfoItem label="轴数" enLabel="Axle Count" value={result.axes_num} enValue={translatedData?.["Axle Count"]} />
                <InfoItem label="核定载客" enLabel="Seat Count" value={result.seatnum ? `${result.seatnum}人` : undefined} enValue={translatedData?.["Seat Count"]} />
                <InfoItem label="车厢数量" enLabel="Body Type" value={result.bodytype} enValue={translatedData?.["Body Type"]} />
                <InfoItem label="整车质量(kg)" enLabel="Curb Weight" value={result.weight} enValue={translatedData?.["Curb Weight"]} />
                <InfoItem label="总质量(kg)" enLabel="Gross Weight" value={result.full_weight_max} enValue={translatedData?.["Gross Weight"]} />
              </div>
            </div>

            {/* Group & Remark */}
            <div className="p-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                其他信息
                {translatedData && <span className="text-sm font-normal text-muted-foreground/70">Additional Information</span>}
                {translatedData && <Badge variant="secondary" className="ml-auto">EN</Badge>}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem label="车组名称" enLabel="Group Name" value={result.groupname} enValue={translatedData?.["Group Name"]} />
                <InfoItem label="车组编码" enLabel="Group Code" value={result.group_code} enValue={translatedData?.["Group Code"]} />
                <InfoItem label="备注" enLabel="Remark" value={result.remark} span={2} enValue={translatedData?.Remark} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!result && !loading && !error && (
        <Card>
          <CardContent className="py-16 text-center">
            <Car className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">输入 VIN 码查询车辆完整参数信息</p>
            <p className="text-sm text-muted-foreground/60 mt-2">支持 17 位标准 VIN 码</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoItem({ label, value, span, enLabel, enValue }: {
  label: string;
  value?: string;
  span?: number;
  enLabel?: string;
  enValue?: string;
}) {
  const hasValue = !!value && value.trim() !== "";
  const display = hasValue ? value : "—";
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <div className="text-xs text-muted-foreground mb-0.5">
        {enLabel ? (
          <>
            <span>{label}</span>
            <span className="text-muted-foreground/60 ml-1">({enLabel})</span>
          </>
        ) : (
          label
        )}
      </div>
      <div className={`text-sm font-medium break-words ${hasValue ? "" : "text-muted-foreground/40"}`}>
        {enValue && hasValue ? (
          <>
            <span>{display}</span>
            <span className="text-muted-foreground/60 ml-1">({enValue})</span>
          </>
        ) : (
          display
        )}
      </div>
    </div>
  );
}
