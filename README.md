# Weather Dashboard

モバイルファーストの天気ダッシュボード（Next.js 14, TypeScript, Tailwind）。地点と日付を指定すると、当日予報（実線）と昨日実績（破線）の気温推移を 1 時間刻みで重ねて表示します。地点はプリセット選択とインクリメンタルサーチの両方で指定できます。

## 特徴
- Next.js App Router + TypeScript + Tailwind で構築
- Open-Meteo API を Route Handlers 経由で呼び出し、1 時間刻みでデータ整形
- Recharts で予報（実線）と実績（破線）を重ね描画
- プリセット地点セレクト + インクリメンタルサーチ（/api/geocode）
- 時間帯ごとの簡易天気アイコン表示

## 必要要件
- Node.js 20 以上
- npm 10 以上（同梱の `package-lock.json` を利用することを推奨）
- ネットワーク（Open-Meteo へのアクセス用）

## セットアップ
```bash
npm install
```

## ローカル実行
開発サーバーを起動し、`http://localhost:3000` を開きます。
```bash
npm run dev
```

## テスト・Lint・ビルド
```bash
npm run lint   # ESLint
npm run test   # Vitest + Testing Library（Open-Meteo はモック）
npm run build  # Next.js 本番ビルド
```

## プロジェクト構成（主要部）
- `app/page.tsx` — クライアント UI（地点/日付選択、グラフ、アイコン）
- `app/api/geocode/route.ts` — 地名検索（Open-Meteo Geocoding）
- `app/api/weather/route.ts` — 当日予報 + 昨日実績の 24 点配列を返す
- `src/lib/weather/` — 型、日付ユーティリティ、Open-Meteo フェッチとデータ整形、プリセット地点、天気コード変換
- `src/components/TemperatureChart.tsx` — Recharts グラフ（実線/破線）
- `app/__tests__/page.test.tsx` — UI 統合テスト（fetch をモック）
- `src/lib/weather/__tests__/` — 日付ユーティリティとデータ整形のユニットテスト

## API エンドポイント
- `GET /api/geocode?q=<text>&count=<n>&language=ja`  
  Open-Meteo のジオコーディングを背後で利用し、地点候補の配列を返します。
- `GET /api/weather?lat=<num>&lon=<num>&date=YYYY-MM-DD&timezone=<tz>&name=<label>`  
  当日予報（または過去日のヒストリカル予報）と昨日実績を 1 時間刻みの配列で返します。

## メモ
- 実ブラウザでの動作にはネットワークが必要です。テストでは fetch をモックしているため外部 API への通信は発生しません。
- jsdom 上で Recharts をレンダリングする際、チャート寸法に関する警告が出ることがありますがテスト結果には影響しません。
