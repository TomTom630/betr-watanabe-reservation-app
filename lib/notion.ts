import { Client } from "@notionhq/client";

export const notion = process.env.NOTION_API_KEY
  ? new Client({ auth: process.env.NOTION_API_KEY })
  : null;

// BeTR Watanabe 予約表 のデータベースID
export const DATABASE_ID = process.env.NOTION_DATABASE_ID || "a0391924917846ccb59d70c493d1dfd9";

export type Entry = {
  pageId: string;
  date: string;
  status: string;
  memo: string;
  photoUrls: string[];
  updatedAt: string;
};

export async function listEntries(): Promise<Entry[]> {
  if (!notion) return [];
  try {
    const res = await notion.databases.query({
      database_id: DATABASE_ID,
      sorts: [{ property: "日付", direction: "descending" }],
      page_size: 100,
    });
    return (res.results as any[]).map(mapPage);
  } catch (err: any) {
    console.error("Notion query error:", err?.body || err?.message || err);
    throw err;
  }
}

function mapPage(page: any): Entry {
  const props = page.properties || {};
  const date = props["日付"]?.date?.start || "";
  const status = props["ステータス"]?.select?.name || "未確認";
  const memo = (props["メモ"]?.rich_text || []).map((t: any) => t.plain_text).join("") || "";
  const files = props["写真"]?.files || [];
  const photoUrls = files.map((f: any) => f.file?.url || f.external?.url).filter(Boolean);
  return {
    pageId: page.id,
    date,
    status,
    memo,
    photoUrls,
    updatedAt: page.last_edited_time,
  };
}

/**
 * 同じ日付のエントリがあれば写真を上書き、なければ新規作成
 */
export async function upsertEntry(date: string, photoUrl: string, photoName: string): Promise<{ pageId: string; created: boolean }> {
  if (!notion) throw new Error("Notion client not configured");

  const existing = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      property: "日付",
      date: { equals: date },
    },
    page_size: 1,
  });

  const fileEntry = {
    type: "external" as const,
    name: photoName,
    external: { url: photoUrl },
  };

  if (existing.results.length > 0) {
    const page: any = existing.results[0];
    await notion.pages.update({
      page_id: page.id,
      properties: {
        "写真": { files: [fileEntry] },
        "ステータス": { select: { name: "未確認" } },
      },
    });
    return { pageId: page.id, created: false };
  }

  const created: any = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      "名前": { title: [{ text: { content: `${date} 予約表` } }] },
      "日付": { date: { start: date } },
      "写真": { files: [fileEntry] },
      "ステータス": { select: { name: "未確認" } },
    },
  });
  return { pageId: created.id, created: true };
}
