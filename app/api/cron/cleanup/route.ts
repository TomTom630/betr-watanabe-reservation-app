import { NextResponse } from "next/server";
import { notion, DATABASE_ID, cleanupOldNoteLogs } from "@/lib/notion";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RETENTION_DAYS = 30;

export async function GET(req: Request) {
  // Vercel Cron Jobs auth (CRON_SECRET in env)
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!notion) {
    return NextResponse.json({ error: "Notion not configured" }, { status: 500 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const res = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      property: "日付",
      date: { before: cutoffStr },
    },
    page_size: 100,
  });

  const deleted: Array<{ pageId: string; date: string }> = [];
  let blobDeleteCount = 0;

  for (const page of res.results as any[]) {
    const props = page.properties || {};
    const files = props["写真"]?.files || [];

    // Delete photos from Vercel Blob
    for (const f of files) {
      const url = f.external?.url || f.file?.url;
      if (url && url.includes("blob.vercel-storage.com")) {
        try {
          await del(url);
          blobDeleteCount++;
        } catch (e) {
          console.error("Failed to delete blob:", url, e);
        }
      }
    }

    // Archive (trash) the Notion page
    try {
      await notion.pages.update({
        page_id: page.id,
        archived: true,
      });
      deleted.push({
        pageId: page.id,
        date: props["日付"]?.date?.start || "",
      });
    } catch (e) {
      console.error("Failed to archive page:", page.id, e);
    }
  }

  // 申し送りログの30日以上前のエントリも削除
  const noteLogsDeleted = await cleanupOldNoteLogs();

  return NextResponse.json({
    cutoff: cutoffStr,
    pagesDeleted: deleted.length,
    blobsDeleted: blobDeleteCount,
    noteLogsDeleted,
    items: deleted,
  });
}
