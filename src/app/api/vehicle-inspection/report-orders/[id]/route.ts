/**
 * GET/PUT /api/vehicle-inspection/report-orders/[id]
 *
 * 报告订单：查询详情、更新状态
 * - 对应需求 0005（报告独立执行）
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getReportOrderById,
  updateReportOrderStatus,
} from '@/lib/vehicle-inspection/report-order-service';
import type { ReportOrderStatus, FinancialStatus } from '@/lib/vehicle-inspection/report-orders';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const order = await getReportOrderById(token, id);

    if (!order) {
      return NextResponse.json({ error: '报告订单不存在' }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: '未授权，请先登录' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const { status, financialStatus, resultSummary, errorMessage } = body as {
      status?: ReportOrderStatus;
      financialStatus?: FinancialStatus;
      resultSummary?: string | null;
      errorMessage?: string | null;
    };

    if (!status) {
      return NextResponse.json({ error: '状态不能为空' }, { status: 400 });
    }

    const order = await updateReportOrderStatus(
      token,
      id,
      status,
      financialStatus,
      resultSummary,
      errorMessage
    );

    return NextResponse.json({ data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}