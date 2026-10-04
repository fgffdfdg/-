import { NextRequest, NextResponse } from 'next/server';
import { queryFreightower, isFreightowerConfigured } from '@/lib/tracking/freightower-client';
import { mapFreightowerToQueryResult } from '@/lib/tracking/freightower-mapper';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // If Freightower API is configured, try to refresh
    if (isFreightowerConfigured()) {
      const body = await request.json().catch(() => ({}));
      const { billNo, containerNo, isExport } = body;

      const input = billNo || containerNo || '';
      if (input) {
        console.log('[tracking] Refreshing via Freightower API for:', { billNo, containerNo });

        try {
          const ftResponse = await queryFreightower({
            billNo: billNo || '',
            containerNo: containerNo || '',
            carrierCode: 'AUTO',
            isExport: isExport || 'E',
            portCode: '',
          });

          if (ftResponse.statusCode === 20000) {
            const result = mapFreightowerToQueryResult(ftResponse, input);
            return NextResponse.json({ success: true, data: result });
          }

          console.warn('[tracking] Freightower refresh returned non-20000:', ftResponse.statusCode, ftResponse.message);
        } catch (err) {
          console.error('[tracking] Freightower refresh call failed:', err);
        }
      }
    }

    return NextResponse.json(
      { success: false, error: '刷新失败：Freightower API 未配置或查询无结果' },
      { status: 502 }
    );
  } catch (error) {
    console.error('[tracking] Refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '刷新失败，请稍后重试',
      },
      { status: 500 }
    );
  }
}