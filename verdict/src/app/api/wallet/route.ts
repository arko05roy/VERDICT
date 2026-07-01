import { NextResponse } from "next/server";
import { getWalletInfo } from "../../../lib/midnight";

export async function GET() {
  try {
    const info = await getWalletInfo();
    return NextResponse.json(info);
  } catch (err: any) {
    return NextResponse.json(
      {
        address: null,
        balance: "0",
        isSynced: false,
        error: err?.message,
      },
      { status: 200 }
    );
  }
}
