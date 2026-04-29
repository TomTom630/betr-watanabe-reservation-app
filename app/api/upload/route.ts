import { NextRequest, NextResponse } from "next/server";
import { upsertEntry } from "@/lib/notion";
import { readDateFromImage } from "@/lib/openai";
import { uploadToStorage } from "@/lib/storage";
import { convertToJpegIfHeic } from "@/lib/heic";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Result = {
  filename: string;
  date: string | null;
  status: string;
  pageId?: string;
  photoUrl?: string;
  created?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) {
      return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
    }

    const results: Result[] = [];

    for (const file of files) {
      try {
        const originalName = file.name;
        const initialBuf = Buffer.from(await file.arrayBuffer());

        // HEIC -> JPEG conversion if needed
        const converted = await convertToJpegIfHeic(initialBuf, originalName);
        const buf = converted.buffer;
        const filename = converted.filename;
        const contentType = converted.contentType;

        // AI date reading
        const b64 = buf.toString("base64");
        const date = await readDateFromImage(b64);

        if (!date) {
          results.push({ filename: originalName, date: null, status: "日付読み取り失敗" });
          continue;
        }

        // Upload to Vercel Blob
        const photoUrl = await uploadToStorage(filename, buf, contentType);

        // Save to Notion (upsert)
        const { pageId, created } = await upsertEntry(date, photoUrl, filename);

        results.push({
          filename: originalName,
          date,
          status: created ? "新規登録完了" : "上書き完了",
          pageId,
          photoUrl,
          created,
        });
      } catch (err: any) {
        console.error(`Error processing ${file.name}:`, err);
        results.push({
          filename: file.name,
          date: null,
          status: `エラー: ${err?.message || "unknown"}`,
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}