# sketch02.jpg 風の天気カード UI への刷新

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

このリポジトリには ExecPlan の作法が `.agent/PLANS.md` に定義されているため、この文書も `.agent/PLANS.md` に従って保守する。目的は `docs/sketch02.jpg` に近いダークトーンの天気カード UI を実現し、ブラウザでの観察とテストで確かめられる形で完了させること。

## Purpose / Big Picture

`docs/sketch02.jpg` に沿った、1 枚のカードで天気推移を直感的に読める UI を用意する。ユーザーは地点と日付を指定したあと、暗いグラデーション背景上に白い実線の予報と灰色破線の昨日実績が重なって見え、ポイントごとに色付きの温度ラベルが表示される。下部には 3 時間刻みのアイコンと降水確率が並び、カードだけで主要情報が読み取れる。実装完了後、ブラウザで地点を切り替えても同じスタイルで描画され、`npm run lint`, `npm run test`, `npm run build` が通ることを確認する。

## Progress

- [x] (2026-01-14 11:53Z) 本計画ファイルを新規作成し、目的と現状、作業方針を整理した。
- [x] (2026-01-14 12:06Z) `docs/sketch02.jpg` の質感に合わせたテーマ（背景/フォント/カードのグラデーション）を適用した。
- [x] (2026-01-14 12:06Z) チャート描画を白実線 + 灰破線 + 色付きラベル付きポイントに差し替え、軸・ツールチップをミニマル化した。
- [x] (2026-01-14 12:06Z) アイコン列を 3 時間刻みに整え、降水確率テキストを併記するデザインへ刷新した。
- [x] (2026-01-14 12:08Z) 画面全体のレイアウトとテストを更新し、`npm run lint`, `npm run test`, `npm run build` が通ることを検証した。

## Surprises & Discoveries

- Observation: Vitest(jsdom) 上で Recharts を描画すると、コンテナ寸法が 0 と判定される警告がテスト出力に残るが、UI 表示やテスト結果に影響はなかった。
  Evidence: `npm run test` 実行時に「The width(-1) and height(-1) of chart should be greater than 0」が標準エラーに出力されるが、全テストはパスする。

## Decision Log

- Decision: UI 改修では既存の Recharts と Tailwind を使い、グラデーション背景やバッジ装飾は CSS/Tailwind で実現する。
  Rationale: 依存を増やさず短時間で `sketch02` の質感に寄せやすく、既存のテスト基盤（Vitest + Testing Library）もそのまま流用できる。
  Date/Author: 2026-01-14 / Codex

## Outcomes & Retrospective

`docs/sketch02.jpg` 風のダークカードに刷新し、白実線＋灰破線＋カラーラベル付きのチャートと、3 時間刻みアイコン行（降水確率併記）を実装した。`npm run lint`, `npm run test`, `npm run build` は全て成功。jsdom での Recharts サイズ警告は残るが挙動に影響なし。

## Context and Orientation

リポジトリは Next.js 14（App Router, TypeScript, Tailwind, Recharts, Vitest）で構成される。主要ファイルは次の通り。
- `app/page.tsx`: クライアントコンポーネント。地点プリセット/検索、日付入力、チャート描画（`TemperatureChart`）、天気アイコンのグリッドを表示する。
- `src/components/TemperatureChart.tsx`: Recharts で予報/実績を重ね線として描画する。現在は青実線＋紫破線＋凡例付きのシンプルなスタイル。
- `app/globals.css`, `app/layout.tsx`: 全体のフォントと背景色（現在は濃紺一色）。
- `src/lib/weather/weatherCode.ts`: weather code をラベルとシンボル（SUN/CLD など）へマッピングする。アイコン表示に利用。
- `app/__tests__/page.test.tsx`: UI の基本的な描画と地点切り替えを検証する。

現状 UI は情報量が多いカード/セクション構成で、`sketch02` のような 1 枚カードの凝縮されたデザインとは異なる。ライン色や背景の質感、ポイントラベル、アイコン列の見せ方を刷新する必要がある。

## Plan of Work

1. テーマ刷新: 背景を夜空風のラジアル/リニアグラデーションにし、フォントを落ち着いたサンセリフ（例: Noto Sans JP）へ変更する。カードは丸みとグロウのあるグラデーションを付与し、文字色/陰影を `sketch02` に寄せる。`color-scheme` を dark に整え、body 背景を統一。
2. チャート再設計: `TemperatureChart` で白実線（予報）と灰破線（昨日実績）を太めに描画し、凡例を削除してミニマル化する。軸は淡いドット/ラベルのみ残す。特定ポイント（最高/最低/氷点付近など）にカラーラベル付きのバッジを置き、ラインの強調と同時に `sketch02` のアクセントを再現する。ツールチップはシンプルな小型バルーンにして透明感を持たせる。
3. アイコン列刷新: 24 点のうち 3 時間刻みにサンプリングし、`weatherCode` に応じた絵文字/簡易アイコンを出す。降水確率は weather code から簡易換算（晴れ=0%, 雨系=10–60% など）し、アイコン下に `%` で表示する。時間ラベルとデリミタ（・）を付けて `sketch02` の下部表示に合わせる。
4. ページレイアウト統合: `app/page.tsx` を 1 枚のカード中心に再構成し、コントロール（地点/日付）はカード上部〜サブヘッダにまとめてスリムにする。ロード中・エラー表示も新しい配色に合わせる。既存テキストを必要最小限にし、視覚優先の UI に寄せる。
5. テスト/バリデーション更新: UI 変更に伴いテストを修正し、新デザインで表示されるキー要素（地点名、アイコン行、温度ラベル）が検証できるようにする。`npm run lint`, `npm run test`, `npm run build` を実行し、スナップショットなしで挙動を確認する。

## Milestones

### Milestone 1: テーマとカード土台を `sketch02` 風に整える
背景グラデーション、フォント設定、カードの角丸と陰影を導入し、既存レイアウトを 1 枚のヒーローカード構成へ寄せる。完了時にはトップカードが暗いグラデーション背景に浮かび、地点名が大きく表示される。

### Milestone 2: チャートの再スタイリング
`TemperatureChart` を白実線＋灰破線＋カラーラベル付きポイントに変更し、軸/凡例/ツールチップをミニマル化する。完了時には `sketch02` に近いライン質感が表示され、最低/最高などのラベルが色付きで載る。

### Milestone 3: アイコン行と付随情報の刷新
3 時間刻みのアイコン行を設計し、時間ラベルと降水確率テキストを付ける。完了時にはカード下部に整列したアイコンと `%` 表示が並ぶ。

### Milestone 4: 仕上げと検証
ページ構成とテストを更新し、`npm run lint`, `npm run test`, `npm run build` がパスすることを確認する。エラー/ローディング表示も新配色に調整する。

## Concrete Steps

以降のコマンドはリポジトリルート（`/workspaces/weather-dashboard`）で実行する。

1) フォントと背景を設定する。`app/layout.tsx` で Google フォントを読み込み、`app/globals.css` で背景グラデーションと color-scheme を dark に更新する。
2) `app/page.tsx` を 1 枚カード中心の構成へ改修し、上部に地点/日付、中央にチャート、下部に 3 時間刻みアイコンを配置する。文言を最小限にし、ローディング/エラー表示を新配色に合わせる。
3) `src/components/TemperatureChart.tsx` を再スタイリングし、白実線・灰破線・カラーラベル付きポイント・ミニマル軸/ツールチップにする。補助的なシャドウやドットを追加して視認性を上げる。
4) `src/lib/weather/weatherCode.ts` を拡張し、絵文字ベースのアイコンと簡易降水確率推定関数を追加する。アイコン行は 3 時間刻みのデータを整形し、降水確率を併記する。
5) テスト（`app/__tests__/page.test.tsx`）を新 UI に合わせて修正し、`npm run lint && npm run test && npm run build` を実行して結果を記録する。

## Validation and Acceptance

受け入れ条件:
- ブラウザで地点を選ぶと、暗いグラデーション背景のカードに白実線（予報）と灰破線（昨日実績）が重なって表示される。最低/最高などのポイントに色付きラベルが描画される。
- カード下部に 3 時間刻みのアイコンと降水確率が並び、時間ラベルが付き、地点/日付を変えても更新される。
- エラー/ローディング表示も新テーマに調和している。
- 次のコマンドが成功すること。

    npm run lint
    npm run test
    npm run build

## Idempotence and Recovery

スタイル変更が中心でデータ破壊はない。Tailwind クラスや Recharts オプション変更は再適用しても安全。もしデザイン変更で崩れた場合は、`git diff` で差分を確認し、部分的に元へ戻せる。フォント読み込みに失敗したときはローカルフォールバックを指定しておく。

## Artifacts and Notes

現状のチャートは凡例つきシンプルラインで、`TemperatureChart` の線色は `#22d3ee`（予報）と `#c084fc`（昨日実績）。背景は `body` の `bg-slate-950`。`sketch02` に合わせるにはここを重点的に変える。

## Interfaces and Dependencies

新規依存は導入しない方針（フォントは Next.js の `next/font/google` を利用）。既存の `TemperatureChart` API（`data: { hour, forecast?, actual? }[]`）は維持し、追加のラベル計算は内部で行う。アイコン行では `weatherCode` から `emoji` と `rainChance` を返す関数を `weatherCode.ts` に用意し、`app/page.tsx` から利用する。

Revision Note (2026-01-14 11:53Z, Codex): 新規作成。`sketch02.jpg` に沿った UI 改修の目的・方針・マイルストンを記述し、初回の進捗を記録した。
Revision Note (2026-01-14 12:08Z, Codex): テーマ/チャート/アイコンのスタイルを `sketch02` 風に実装し、lint/test/build 成功を反映。Surprises に jsdom + Recharts の寸法警告を追記。
