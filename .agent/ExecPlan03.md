# フラットな白基調デザインへの刷新

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

`.agent/PLANS.md` の規約に従う。目的は現行のダーク＋グラデーション UI を、白を基調としたフラット（余計な陰影・グローなし）デザインへ刷新すること。ブラウザで確認でき、lint/test/build が通る状態で完了とする。

## Purpose / Big Picture

ユーザーが地点・日付を選ぶと、白地のシンプルなカード内で予報（実線）と実績（破線）のラインチャートと天気タイムラインを確認できるようにする。余計なグラデーションや強いシャドウを廃し、読みやすいコントラストとフラットな UI に統一する。

## Progress

- [x] (2026-01-14 13:30Z) 本計画を作成し、白基調への刷新方針を整理した。
- [x] (2026-01-14 13:45Z) テーマ（背景/フォントカラー/カード/フォーム）のフラット化を実装した。
- [x] (2026-01-14 13:45Z) チャート・タイムラインの配色とスタイルを白基調に合わせて再調整した。
- [x] (2026-01-14 13:34Z) テスト・ビルドを実行し、完了を確認した。

## Surprises & Discoveries

- Observation: jsdom + Recharts でチャートコンテナ寸法警告（width/height -1）がテスト標準エラーに出るが、テストはパスし、動作への影響はない。
  Evidence: `npm run test` 実行時の警告出力のみで、全テスト成功。

## Decision Log

- Decision: Tailwind のユーティリティのみで白基調を実現し、新規 UI ライブラリは導入しない。
  Rationale: 依存を増やさず短時間で全画面を統一配色に切り替えられる。
  Date/Author: 2026-01-14 / Codex

## Outcomes & Retrospective

白基調のフラットデザインへ統一し、カード/フォーム/チャート/タイムラインを淡色のボーダーとシャドウレスなスタイルに変更した。チャート配色を濃グレー×グレーに調整し、ツールチップも白背景へ。`npm run lint`, `npm run test`, `npm run build` は全て成功。Recharts のテスト警告は残存するが既知で影響なし。

## Context and Orientation

現行はダークグラデーション背景（`app/globals.css`）とカードに強めのシャドウを付けたデザイン。`app/layout.tsx` で Noto Sans JP を適用。`app/page.tsx` が主要な UI（フォーム、チャート、タイムライン）。`src/components/TemperatureChart.tsx` で Recharts をスタイリング。`src/lib/weather/weatherCode.ts` の絵文字をタイムライン表示に利用。テストは `app/__tests__/page.test.tsx` など。

## Plan of Work

1) テーマ刷新: `app/globals.css` で背景を白ベースに変更し、色スキームを light に戻す。`app/layout.tsx` の body クラスとカードの配色を白/グレー系へ。過度なシャドウ・グラデーションを削減。
2) ページ構成のスタイル更新: `app/page.tsx` でカード背景・ボーダー・フォームの色を白系に変更し、ヘッダ文言やバッジの配色を控えめにする。タイムラインコンテナもフラットに。
3) チャート配色の更新: `src/components/TemperatureChart.tsx` でラインを濃グレー/オレンジなど白地で見やすい色にし、背景・グリッド・ツールチップを淡色に調整。
4) テスト・ビルド: `npm run lint && npm run test && npm run build` を実行し、結果を記録。

## Concrete Steps

作業ディレクトリは `/workspaces/weather-dashboard`。

1) `app/globals.css` の背景を白系グラデに変更し、color-scheme を light へ。`app/layout.tsx` の body クラスを白背景に合わせる。
2) `app/page.tsx` のカード/フォーム/見出しをフラット白基調へ再スタイル。過度なシャドウやグラデーションを削除。
3) `src/components/TemperatureChart.tsx` の色・ツールチップ・グリッドを白背景用に調整。
4) `npm run lint && npm run test && npm run build` を実行して完了を確認。

## Validation and Acceptance

- 画面全体が白を基調にし、背景グラデや強いシャドウが除去されている。
- ラインチャートが白地で読みやすい配色（実線/破線のコントラスト）になっている。
- タイムラインカードが白系フラットで統一されている。
- `npm run lint`, `npm run test`, `npm run build` が成功する。

## Idempotence and Recovery

スタイル変更のみで破壊的操作なし。差分を戻す場合は git で個別ファイルをリバート可能。色変更は再適用しても安全。

## Artifacts and Notes

現状のダーク背景設定: `app/globals.css` の radial-gradient と `color-scheme: dark`。カードのシャドウやグラデは `app/page.tsx` の Tailwind クラスで指定されている。

## Interfaces and Dependencies

新規依存なし。既存のコンポーネント構成と props は変えない（TemperatureChart の API も維持）。

Revision Note (2026-01-14 13:34Z, Codex): 白基調のフラットデザインへ刷新し、チャート/タイムライン/フォームの配色を変更。lint/test/build 成功を確認し、既知の Recharts 警告を Surprises に記録。
