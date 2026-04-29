import { NextResponse } from "next/server";
import { listEntries } from "@/lib/notion";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await listEntries();
    return NextResponse.json({ entries });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
