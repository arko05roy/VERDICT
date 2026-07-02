import { NextResponse } from "next/server";
import { getCheckMetadata } from "@/lib/checks/registry";

export async function GET() {
  return NextResponse.json({ checks: getCheckMetadata() });
}
