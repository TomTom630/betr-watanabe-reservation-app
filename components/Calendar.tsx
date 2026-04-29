"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";

type Entry = {
  pageId: string;
  date: string;
  status: string;
  memo: string;
  photoUrls: string[];
  updatedAt: string;
};

export default function Calendar() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(6);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const fetchEntries = async () => {
    try {
      const r = await fetch("/api/entries");
      const d = await r.json();
      setEntries(d.entries || []);
      setLoading(false);
      return d.entries || [];
    } catch {
      setLoading(false);
      return [];
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

  const entryByDate = new Map(entries.map(e => [e.date, e]));

  const firstDow = new Date(viewYear, viewMonth - 1, 1).getDay();
  const lastDate = new Date(viewYear, viewMonth, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(d);

  const prevMonth = () => {
    let m = viewMonth - 1, y = viewYear;
    if (m < 1) { m = 12; y--; }
    setViewMonth(m); setViewYear(y);
  };
  const nextMonth = () => {
    let m = viewMonth + 1, y = viewYear;
    if (m > 12) { m = 1; y++; }
    setViewMonth(m); setViewYear(y);
  };

  const handleEditFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEntry) {
      e.target.value = "";
      return;
    }
    setEditing(true);
    const formData = new FormData();
    formData.append("files", file);
    formData.append("forceDate", selectedEntry.date);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        alert(`エラー: ${data.error}`);
      } else {
        const updatedEntries = await fetchEntries();
        const updated = updatedEntries.find((x: Entry) => x.date === selectedEntry.date);
        if (updated) setSelectedEntry(updated);
      }
    } catch (err: any) {
      alert(`エラー: ${err.message}`);
    }
    setEditing(false);
    e.target.value = "";
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold">BeTR：Watanabe 予約表 <span className="text-xs font-medium text-gray-500 ml-2">カレンダー</span></div>
        <a href="/upload" className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg active:bg-orange-600">📸 写メ追加</a>
      </div>
      <div className="flex items-center justify-center gap-4 mb-3">
        <button onClick={prevMonth} className="w-9 h-9 rounded-lg bg-white border text-lg active:bg-gray-100">‹</button>
        <div className="text-base font-semibold min-w-[130px] text-center">{viewYear}年 {viewMonth}月</div>
        <button onClick={nextMonth} className="w-9 h-9 rounded-lg bg-white border text-lg active:bg-gray-100">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
          <div key={d} className={`text-center text-xs font-semibold py-1 ${i === 0 ? "text-red-500" : i === 6 ? "text-teal-500" : "text-gray-500"}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="invisible aspect-[1/1.15]"></div>;
          const dow = (firstDow + d - 1) % 7;
          const dateKey = ymd(viewYear, viewMonth, d);
          const entry = entryByDate.get(dateKey);
          const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth - 1 && today.getDate() === d;
          const hasPhoto = entry && entry.photoUrls.length > 0;
          return (
            <div
              key={i}
              onClick={hasPhoto ? () => setSelectedEntry(entry!) : undefined}
              className={[
                "aspect-[1/1.15] bg-white border rounded-lg p-1.5 flex flex-col items-center gap-0.5",
                isToday ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200",
                hasPhoto ? "bg-orange-50 border-orange-300 cursor-pointer active:bg-orange-100" : "",
              ].join(" ")}
            >
              <div className={`text-xs font-semibold ${dow === 0 ? "text-red-500" : dow === 6 ? "text-teal-500" : "text-gray-700"}`}>{d}</div>
              {hasPhoto && (
                <Image src={entry.photoUrls[0]} alt="" width={150} height={150} className="w-full flex-1 min-h-0 rounded object-cover mt-0.5" />
              )}
            </div>
          );
        })}
      </div>
      <div className="text-center text-xs text-gray-500 mt-4 leading-relaxed">
        オレンジ枠＝予約表写真あり｜タップで拡大表示<br />
        {loading ? "読み込み中..." : `${entries.length}件登録`}
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button onClick={() => setSelectedEntry(null)} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/15 text-white text-xl z-10">✕</button>
          {selectedEntry.photoUrls[0] && (
            <Image src={selectedEntry.photoUrls[0]} alt="" width={1200} height={1600} className="max-w-full max-h-full object-contain" priority />
          )}
          <div className="absolute top-3 left-3 text-white bg-black/55 px-3 py-1.5 rounded-2xl text-sm">
            {selectedEntry.date.replace(/-/g, "/")}
          </div>
          <input ref={editFileInputRef} type="file" accept="image/*" onChange={handleEditFile} className="hidden" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <button
              onClick={() => editFileInputRef.current?.click()}
              disabled={editing}
              className="px-5 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-full active:bg-orange-600 disabled:opacity-50"
            >
              {editing ? "更新中..." : "📝 写真を修正"}
            </button>
          </div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/70 text-xs">
            最終更新: {new Date(selectedEntry.updatedAt).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      )}
    </div>
  );
}