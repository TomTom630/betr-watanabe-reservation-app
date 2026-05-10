import { NextRequest, NextResponse } from "next/server";
import { getSharedNote, setSharedNote } from "@/lib/notion";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const data = await getSharedNote();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const content: string = typeof body?.content === "string" ? body.content : "";
    const data = await setSharedNote(content);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
