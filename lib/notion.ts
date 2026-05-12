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
// =================================
// 申し送り共有メモ（Notionページの本文に保存）
// =================================
export const NOTES_PAGE_ID = process.env.NOTION_NOTES_PAGE_ID || "";

export async function getSharedNote(): Promise<{ content: string; updatedAt: string }> {
  if (!notion || !NOTES_PAGE_ID) return { content: "", updatedAt: "" };
  try {
    const page: any = await notion.pages.retrieve({ page_id: NOTES_PAGE_ID });
    const blocks = await notion.blocks.children.list({ block_id: NOTES_PAGE_ID, page_size: 100 });
    const lines: string[] = [];
    for (const b of blocks.results as any[]) {
      if (b.type === "paragraph") {
        const text = (b.paragraph?.rich_text || []).map((t: any) => t.plain_text || "").join("");
        lines.push(text);
      }
    }
    return { content: lines.join("\n"), updatedAt: page.last_edited_time || "" };
  } catch (err: any) {
    console.error("getSharedNote error:", err?.body || err?.message || err);
    return { content: "", updatedAt: "" };
  }
}

export async function setSharedNote(content: string): Promise<{ updatedAt: string }> {
  if (!notion || !NOTES_PAGE_ID) throw new Error("Notes page not configured");

  // 既存の子ブロックを全削除
  const existing = await notion.blocks.children.list({ block_id: NOTES_PAGE_ID, page_size: 100 });
  await Promise.all(
    (existing.results as any[]).map((b) =>
      notion.blocks.delete({ block_id: b.id }).catch(() => null)
    )
  );

  // 行ごとにparagraphブロックを追加（1行2000文字以内に分割）
  const lines = content.split("\n");
  const children = lines.map((line) => {
    const safeLine = line.slice(0, 2000);
    return {
      object: "block" as const,
      type: "paragraph" as const,
      paragraph: {
        rich_text: safeLine.length > 0
          ? [{ type: "text" as const, text: { content: safeLine } }]
          : [],
      },
    };
  });

  // Notion APIは1リクエスト100ブロックまで
  const chunks: typeof children[] = [];
  for (let i = 0; i < children.length; i += 100) {
    chunks.push(children.slice(i, i + 100));
  }
  for (const chunk of chunks) {
    if (chunk.length > 0) {
      await notion.blocks.children.append({ block_id: NOTES_PAGE_ID, children: chunk as any });
    }
  }

  const updated: any = await notion.pages.retrieve({ page_id: NOTES_PAGE_ID });
  return { updatedAt: updated.last_edited_time || "" };
}

// =================================
// 申し送りログ（日付付き履歴タイムライン）
// =================================
export const NOTES_LOG_DATABASE_ID = process.env.NOTION_NOTES_LOG_DATABASE_ID || "";
const NOTES_LOG_RETENTION_DAYS = 30;

export type NoteLog = {
  pageId: string;
  timestamp: string;
  content: string;
};

export async function listNoteLogs(): Promise<NoteLog[]> {
  if (!notion || !NOTES_LOG_DATABASE_ID) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NOTES_LOG_RETENTION_DAYS);
  try {
    const res = await notion.databases.query({
      database_id: NOTES_LOG_DATABASE_ID,
      filter: {
        property: "タイムスタンプ",
        date: { on_or_after: cutoff.toISOString() },
      },
      sorts: [{ property: "タイムスタンプ", direction: "descending" }],
      page_size: 100,
    });
    return (res.results as any[]).map((page) => {
      const props = page.properties || {};
      const timestamp = props["タイムスタンプ"]?.date?.start || "";
      const content = (props["内容"]?.rich_text || []).map((t: any) => t.plain_text).join("") || "";
      return { pageId: page.id, timestamp, content };
    });
  } catch (err: any) {
    console.error("listNoteLogs error:", err?.body || err?.message || err);
    return [];
  }
}

export async function addNoteLog(content: string): Promise<NoteLog> {
  if (!notion || !NOTES_LOG_DATABASE_ID) throw new Error("Notes log database not configured");
  const now = new Date().toISOString();
  const title = `申し送り ${new Date().toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`;
  const safeContent = content.slice(0, 2000);
  const created: any = await notion.pages.create({
    parent: { database_id: NOTES_LOG_DATABASE_ID },
    properties: {
      "名前": { title: [{ text: { content: title } }] },
      "タイムスタンプ": { date: { start: now } },
      "内容": { rich_text: [{ text: { content: safeContent } }] },
    },
  });
  return { pageId: created.id, timestamp: now, content: safeContent };
}

export async function deleteNoteLog(pageId: string): Promise<void> {
  if (!notion) throw new Error("Notion client not configured");
  await notion.pages.update({ page_id: pageId, archived: true });
}

export async function cleanupOldNoteLogs(): Promise<number> {
  if (!notion || !NOTES_LOG_DATABASE_ID) return 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NOTES_LOG_RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString();
  const res = await notion.databases.query({
    database_id: NOTES_LOG_DATABASE_ID,
    filter: {
      property: "タイムスタンプ",
      date: { before: cutoffStr },
    },
    page_size: 100,
  });
  let deleted = 0;
  for (const page of res.results as any[]) {
    try {
      await notion.pages.update({ page_id: page.id, archived: true });
      deleted++;
    } catch (e) {
      console.error("Failed to archive note log:", page.id, e);
    }
  }
  return deleted;
}

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
