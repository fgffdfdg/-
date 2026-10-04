import { NextRequest, NextResponse } from "next/server";
import { db } from "@/storage/database/shared/db";
import { candidateVehicles, vehicleSources, candidateVehicleCustomers, candidateActivities } from "@/storage/database/shared/schema";
import { eq, desc, sql, and, or, like, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organizationId");
    if (!orgId) return NextResponse.json({ success: false, error: "organizationId required" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [eq(candidateVehicles.organizationId, orgId)];
    const status = searchParams.get("status");
    if (status) conditions.push(eq(candidateVehicles.totalStatus, status as any));
    const responsibleId = searchParams.get("responsiblePersonId");
    if (responsibleId) conditions.push(eq(candidateVehicles.responsiblePersonId, responsibleId));
    const brand = searchParams.get("brand");
    if (brand) conditions.push(eq(candidateVehicles.brand, brand));
    const search = searchParams.get("search");
    if (search) {
      conditions.push(
        or(
          like(candidateVehicles.brand, `%${search}%`),
          like(candidateVehicles.series, `%${search}%`),
          like(candidateVehicles.model, `%${search}%`),
          like(candidateVehicles.vin, `%${search}%`)
        )
      );
    }

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const offset = (page - 1) * pageSize;

    const rows = await db
      .select()
      .from(candidateVehicles)
      .where(and(...conditions))
      .orderBy(desc(candidateVehicles.updatedAt))
      .limit(pageSize)
      .offset(offset)
      .execute();

    // 获取每个候选车辆的关联数据
    const enriched = await Promise.all(
      rows.map(async (cv: Record<string, unknown> & { id: string }) => {
        const sources = await db.select().from(vehicleSources).where(eq(vehicleSources.candidateVehicleId, cv.id));
        const customers = await db.select().from(candidateVehicleCustomers).where(eq(candidateVehicleCustomers.candidateVehicleId, cv.id));
        return {
          ...cv,
          sourceCount: sources.length,
          customerCount: customers.length,
          hasUnreadChanges: sources.some((s: Record<string, unknown> & { isStale: boolean }) => s.isStale),
          sources: sources.slice(0, 3),
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched, page, pageSize });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, createdBy, ...rest } = body;

    const [row] = await db
      .insert(candidateVehicles)
      .values({
        ...rest,
        organizationId,
        createdBy,
        vinStatus: rest.vin ? "verified" : "missing",
        totalStatus: "pending_info",
      })
      .returning();

    return NextResponse.json({ success: true, data: row });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}