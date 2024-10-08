import { prisma } from "@/configs/prisma";
import { NextRequest, NextResponse } from "next/server";
import { addPeriodsToDatabase } from "@/prisma/seed/periodSeed";
import { validateField } from "../helper";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");
    const year = searchParams.get("year");
    const quarter = searchParams.get("quarter");

    const where: Record<string, any> = {};
    if (name) where.name = name;
    if (year) where.year = parseInt(year, 10);
    if (quarter) where.quarter = parseInt(quarter, 10);

    const res = await prisma.period.findMany({
      where,
    });

    return NextResponse.json(res, { status: 200 });
  } catch (error) {
    console.error("Error fetching period:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { year } = await req.json();
    
    validateField(year);

    const res = await addPeriodsToDatabase(parseInt(year, 10));

    return NextResponse.json(res, { status: 200 });
  } catch (error) {
    console.error("Error creating period:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
