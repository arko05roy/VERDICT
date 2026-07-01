import { NextResponse } from "next/server";
import { getNetworkStatus } from "../../../lib/midnight";

export async function GET() {
  try {
    const status = await getNetworkStatus();
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json(
      {
        nodeHealthy: false,
        indexerHealthy: false,
        proofServerHealthy: false,
        blockHeight: null,
        error: err?.message,
      },
      { status: 200 }
    );
  }
}
