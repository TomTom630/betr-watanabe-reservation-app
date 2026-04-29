"use client";
import { useState, useRef } from "react";

type Result = { filename: string; date: string | null; status: string; pageId?: string };

export default function UploadForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<Result[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length) {
      setFiles((prev) => [...prev, ...selected]);
    }
    e.target.value = ""; // reset so same file can be re-selected
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const upload = async () => {
    if (!files.length) return;
    setUploading(true);
    setResults([]);
    setProgress({ current: 0, total: files.length });
    const allResults: Result[] = [];

    for (let i = 0; i < files.length; i++) {
      setProgress({ current: i + 1, total: files.length });
      const formData = new FormData();
      formData.append("files", files[i]);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const text = await res.text();
        let data: any;
        try { data = JSON.parse(text); } catch { data = { error: `サーバーエラー: ${text.slice(0, 100)}` }; }
        if (data.error) {
          allResults.push({ filename: files[i].name, date: null, status: `エラー: ${data.error}` });
        } else if (data.results && data.results[0]) {
          allResults.push(data.results[0]);
        }
      } catch (err: any) {
        allResults.push({ filename: files[i].name, date: null, status: `エラー: ${err.message}` });
      }
      setResults([...allResults]);
    }

    setUploading(false);
    setFiles([]);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-bold">📸 写メをアップロード</div>
        <a href="/" className="text-sm text-blue-600 underline">← カレンダーに戻る</a>
      </div>

      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        撮影した予約表の写真を選んでアップロードすると、AIが自動で日付を読み取ります。<br />
        カメラで1枚ずつ追加するか、ライブラリから複数枚まとめて選択できます。
      </p>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleAdd} className="hidden" />
      <input ref={libraryInputRef} type="file" accept="image/*" multiple onChange={handleAdd} className="hidden" />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center active:bg-gray-100 disabled:opacity-50"
        >
          <div className="text-2xl mb-1">📷</div>
          <div className="font-semibold text-gray-700 text-sm">カメラで撮影<br />（1枚追加）</div>
        </button>
        <button
          onClick={() => libraryInputRef.current?.click()}
          disabled={uploading}
          className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center active:bg-gray-100 disabled:opacity-50"
        >
          <div className="text-2xl mb-1">📁</div>
          <div className="font-semibold text-gray-700 text-sm">ライブラリから<br />選択（複数OK）</div>
        </button>
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold mb-2">アップロード予定: {files.length}枚</div>
          <div className="grid grid-cols-3 gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative aspect-square bg-gray-100 rounded overflow-hidden">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeFile(i)}
                  disabled={uploading}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs"
                >×</button>
              </div>
            ))}
          </div>
          <button
            onClick={upload}
            disabled={uploading}
            className="w-full mt-4 py-3 bg-orange-500 text-white font-bold rounded-lg active:bg-orange-600 disabled:opacity-50"
          >
            {uploading ? `処理中... ${progress.current}/${progress.total}` : `${files.length}枚をアップロード`}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-semibold mb-2">処理結果</div>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="bg-white border rounded-lg p-3 text-sm">
                <div className="font-mono text-xs text-gray-500 mb-1">{r.filename}</div>
                {r.date ? (
                  <div className="text-green-700 font-semibold">📅 {r.date}</div>
                ) : (
                  <div className="text-red-600 font-semibold">⚠️ 失敗</div>
                )}
                <div className="text-gray-600 text-xs mt-1">{r.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}