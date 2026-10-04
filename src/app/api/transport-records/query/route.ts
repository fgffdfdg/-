import { NextRequest, NextResponse } from 'next/server';
import { queryFreightower, isFreightowerConfigured } from '@/lib/tracking/freightower-client';
import { mapFreightowerToQueryResult } from '@/lib/tracking/freightower-mapper';
import { queryTransport } from '@/lib/tracking/data-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { billNo, containerNo, carrierCode, portCode, isExport } = body;

    const input = billNo || containerNo || '';
    if (!input) {
      return NextResponse.json(
        { success: false, error: '请提供提单号或箱号' },
        { status: 400 }
      );
    }

    // If Freightower API is configured, use it
    if (isFreightowerConfigured()) {
      console.log('[tracking] Calling Freightower API for:', { billNo, containerNo, carrierCode });

      try {
        const ftResponse = await queryFreightower({
          billNo: billNo || '',
          containerNo: containerNo || '',
          carrierCode: carrierCode || 'AUTO',
          isExport: isExport || 'E',
          portCode: portCode || '',
        });

        if (ftResponse.statusCode === 20000) {
          const result = mapFreightowerToQueryResult(ftResponse, input);
          return NextResponse.json({ success: true, data: result });
        }

        console.warn('[tracking] Freightower returned non-20000 status:', ftResponse.statusCode, ftResponse.message);
      } catch (err) {
        console.error('[tracking] Freightower API call failed:', err);
      }
    }

    // Fall back to demo data if Freightower is not configured or returned error
    console.log('[tracking] Falling back to demo data');
    const demoResult = queryTransport(input);
    if (demoResult) {
      return NextResponse.json({ success: true, data: demoResult });
    }

    return NextResponse.json({
      success: true,
      data: {
        type: 'unknown',
        input,
        is_demo: false,
        is_existing: false,
        not_found: true,
        message: '未找到匹配的运输记录',
      },
    });
  } catch (error) {
    console.error('[tracking] Query error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '查询失败，请稍后重试',
      },
      { status: 500 }
    );
  }
}