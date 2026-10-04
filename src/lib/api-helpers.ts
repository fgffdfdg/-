import { NextResponse } from "next/server";

// Stub: vehicle-sourcing 模块的 API 辅助函数占位。
// 完整实现将在后续迭代中补充。

export function successResponse(data: unknown, message?: string) {
  return NextResponse.json({ success: true, data, message });
}

export function errorResponse(message: string, status = 500, error?: unknown) {
  console.error(`[API Error] ${message}`, error);
  return NextResponse.json({ success: false, error: message }, { status });
}