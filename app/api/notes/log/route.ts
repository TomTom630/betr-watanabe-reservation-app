import { NextRequest, NextResponse } from "next/server";
import { listNoteLogs, addNoteLog, deleteNoteLog } from "@/lib/notion";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const logs = await listNoteLogs();
    return NextResponse.json({ logs });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const content: string = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content) {
      return NextResponse.json({ error: "内容が空です" }, { status: 400 });
    }
    const log = await addNoteLog(content);
    return NextResponse.json({ log });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await deleteNoteLog(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
