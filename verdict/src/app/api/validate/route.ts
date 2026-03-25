import { NextRequest, NextResponse } from "next/server";
import { validateCompact } from "../../../lib/compact-validator";

export async function POST(req: NextRequest) {
  const { compact } = await req.json();

  if (!compact || typeof compact !== "string" || compact.trim().length === 0) {
    return NextResponse.json(
      { error: "Compact code cannot be empty" },
      { status: 400 }
    );
  }

  const result = validateCompact(compact);
  return NextResponse.json(result);
}
