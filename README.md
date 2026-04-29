# BeTR：Watanabe 予約表 共有アプリ

Watanabe店舗の予約表をスマホで撮影して、AIが日付を自動読み取りしてカレンダーに反映する Web アプリ。AVARIEアプリと同じ仕組み・1名運用版。

## できること

- カレンダーUIで予約表を月単位で一望
- 日付タップで最新写真を全画面表示
- 写真をまとめてアップロード（複数枚一括）
- OpenAI Vision API が写真から日付を自動読み取り
- 結果をNotion DB（BeTR Watanabe 予約表）に保存
- 30日経過した古い予約は自動削除

## 必要な環境変数

`.env.local` を作成して以下を設定してください（`.env.example` をコピーして埋める）。

```
NOTION_API_KEY=secret_xxxxx                              # Notion Integration Token
NOTION_DATABASE_ID=a0391924917846ccb59d70c493d1dfd9     # BeTR Watanabe 予約表DB ID（既設定済み）
NOTION_DATA_SOURCE_ID=0ffa8c01-8567-431e-9b18-1adeb793b12d
OPENAI_API_KEY=sk-xxxxx                                  # OpenAI API キー
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx              # Vercel Blob トークン
CRON_SECRET=任意の長い文字列                             # 自動削除Cron用
```

### 重要：Notion Integrationの接続

このDBに対してNotion Integrationを「Connect to」で接続する必要があります。
Notionで「BeTR Watanabe 予約表」DBを開き、右上「...」→「Connect to」→ 既存のAVARIE用Integrationを選択。

## ローカル起動（Mac）

```bash
cd betr-watanabe-reservation-app
npm install
cp .env.example .env.local   # 編集してトークンを設定
npm run dev
```

ブラウザで http://localhost:3000 を開く

## Vercelへのデプロイ

```bash
npm install -g vercel
vercel login
vercel
```

初回デプロイ時に環境変数の設定を求められるので、上記6つを入力。

## 主な構成

```
app/
  page.tsx              # カレンダーTOP
  upload/page.tsx       # 写真アップロード画面
  api/
    entries/route.ts    # Notion DBから予約一覧取得
    upload/route.ts     # 写真受信→AI日付読取→Notion登録
    cron/cleanup/route.ts # 30日自動削除
components/
  Calendar.tsx          # カレンダーUI（タップで写真大表示）
  UploadForm.tsx        # 一括アップロードフォーム
lib/
  notion.ts             # Notion API ラッパー
  openai.ts             # OpenAI Vision API ラッパー
  storage.ts            # Vercel Blob 保存
  heic.ts               # HEIC→JPEG 変換
```

## 関連DB情報

- **Notion DB:** BeTR Watanabe 予約表
- **DB URL:** https://www.notion.so/a0391924917846ccb59d70c493d1dfd9
- **Database ID:** `a0391924917846ccb59d70c493d1dfd9`
- **Data Source ID:** `0ffa8c01-8567-431e-9b18-1adeb793b12d`

## 備考

このアプリは AVARIE 予約表アプリ（https://avarie-reservation-app.vercel.app）の派生で、
スタッフが Watanabe 1名のみのため、UI上はスタッフ選択列はありません。
