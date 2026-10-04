"use client";

/**
 * 数据联动系统 - useVinAutoFill Hook
 *
 * 在单证表单中调用：输入 VIN → 自动查询 vehicle_archives → 返回填充数据。
 *
 * 使用示例：
 * ```tsx
 * const { lookupByVin, isLoading } = useVinAutoFill("invoice");
 *
 * const handleVinBlur = async (vin: string) => {
 *   const result = await lookupByVin(vin);
 *   if (result?.data) {
 *     setFormData(prev => ({ ...prev, ...result.data }));
 *     toast.success(`已自动填充 ${Object.keys(result.data).length} 个字段`);
 *   }
 * };
 * ```
 */
import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import type { DocTypeKey, VinLookupResult, UseVinAutoFillReturn } from "./types";
import { fetchVehicleByVin } from "./client";
import { applyMapping } from "./mappings";

export function useVinAutoFill(docType: DocTypeKey): UseVinAutoFillReturn {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupByVin = useCallback(
    async (vin: string): Promise<VinLookupResult> => {
      if (!token) {
        setError("未登录");
        return { _fromArchive: false } as VinLookupResult;
      }

      const trimmed = vin.trim();
      if (!trimmed) {
        return { _fromArchive: false } as VinLookupResult;
      }

      setIsLoading(true);
      setError(null);

      try {
        const vehicle = await fetchVehicleByVin(token, trimmed);
        if (!vehicle) {
          setError(`未找到车架号 ${trimmed} 的车辆档案`);
          return { _fromArchive: false } as VinLookupResult;
        }

        const data = applyMapping(vehicle, docType);
        return { ...data, _fromArchive: true } as VinLookupResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : "查询失败";
        setError(message);
        return { _fromArchive: false } as VinLookupResult;
      } finally {
        setIsLoading(false);
      }
    },
    [token, docType]
  );

  return { lookupByVin, isLoading, error };
}