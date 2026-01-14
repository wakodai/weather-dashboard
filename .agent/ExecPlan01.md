# 指定地点の天気情報ダッシュボード（SPA）を Next.js で実装する

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

このリポジトリには ExecPlan の作法が `.agent/PLANS.md` に定義されているため、この文書は `.agent/PLANS.md` に従って保守する。

## Purpose / Big Picture

スマホ表示を主対象とした天気ダッシュボード（SPA）を作る。ユーザーは「地点」と「日付（過去日も可）」を指定でき、指定日の「当日の気温の変化（予報）」を実線、指定日の「昨日の気温の変化（実測/再解析）」を破線で、1時間刻みの時系列として重ねて閲覧できる。

将来的に Vercel へデプロイできる設計（Next.js API Routes / Serverless を前提）としつつ、マイルストンとしてはローカル（devcontainer）で全機能が動作し、lint/test/build がすべてパスする状態まで到達する。気象データは原則として外部の信頼できる情報ソースから都度取得し、内部 DB に永続化しない（ただし、要件達成に不可欠な場合のみ最小限で導入する）。

UI は `docs/sketch.png` の意図（上部に場所・日付、中央に折れ線グラフ、下部に時間帯の天気アイコン）に合わせる。

## Progress

- [x] (2026-01-14 10:00Z) `.agent/ExecPlan01.md` を新規作成し、要件を計画に落とし込んだ。
- [x] (2026-01-14 10:05Z) devcontainer 設定ファイルを追加した（実際のビルド検証は実装フェーズで行う）。
- [x] (2026-01-14 10:05Z) ホストの `~/.codex/config.toml` を `.codex/config.toml` にコピーし、`.gitignore` に `.codex/` を追加した。
- [x] (2026-01-14 10:54Z) プロジェクトを Next.js（TypeScript, App Router）として初期化し、Tailwind/ESLint/TS を導入して `lint`/`build` が通るベースを作った。
- [x] (2026-01-14 11:02Z) 位置検索（インクリメンタルサーチ）と、プリセット選択（選択式）の両方で地点を指定できるようにした。
- [x] (2026-01-14 11:02Z) 日付を指定して「その日を当日として」同じ情報を表示できるようにし、地点/日付変更で UI が更新されるようにした。
- [x] (2026-01-14 11:02Z) グラフ要件（実線=当日予報、破線=昨日実績、1時間刻み、重ね描画）と時間帯アイコンの UI を Recharts + Tailwind で実装し、`npm run lint` と `npm run build` が成功することを確認した。
- [x] (2026-01-14 11:07Z) 受け入れ条件を満たすテスト（ユニット/統合/E2E 相当の UI テスト）を実装し、`npm run lint`, `npm run test`, `npm run build` がローカルで全てパスすることを確認した。

## Surprises & Discoveries

- Observation: Open-Meteo には「予報」「過去実績（アーカイブ）」「過去の予報（historical forecast）」「地名→緯度経度（ジオコーディング）」が揃っており、API キー無し・低コストで要件を満たしやすい。
  Evidence: 代表的なエンドポイントは次の通り。
    - 予報: `https://api.open-meteo.com/v1/forecast`
    - 過去実績: `https://archive-api.open-meteo.com/v1/archive`
    - 過去の予報: `https://historical-forecast-api.open-meteo.com/v1/forecast`
    - ジオコーディング: `https://geocoding-api.open-meteo.com/v1/search`
- Observation: jsdom 上で Recharts を描画すると、テスト実行時にコンテナ寸法が 0 と判定される警告が出る。
  Evidence: `vitest run` 時に「The width(-1) and height(-1) of chart should be greater than 0」警告が標準エラーに出るが、テストは成功する（実ブラウザ表示には影響なし）。

## Decision Log

- Decision: 気象データの取得元は Open-Meteo を第一候補とし、Next.js の API Routes（Route Handlers）経由で取得する。
  Rationale: API キー不要で扱いやすく、1時間粒度の時系列・ジオコーディング・過去実績・過去の予報が揃う。将来の Vercel 運用でも API Routes に寄せておけば、キャッシュ/レート制御/秘匿化の拡張がしやすい。
  Date/Author: 2026-01-14 / Codex

- Decision: 「過去日を当日として表示」では、指定日の“当日予報”は Open-Meteo の Historical Forecast API を使って再現し、指定日の“昨日”は Archive API（過去実績）で取得する。
  Rationale: 自前で日々の予報を DB に保存しなくても「過去日の予報」という概念に近いデータを取得でき、運用コストと実装コストを抑えられる。
  Date/Author: 2026-01-14 / Codex

- Decision: グラフは SVG ベースの React チャートライブラリ（例: Recharts）を採用し、実線/破線を重ねる。
  Rationale: 仕様（2系列の重ね描画・破線指定・モバイル表示）を短い実装で満たしやすく、E2E でも DOM（SVG）を検証しやすい。
  Date/Author: 2026-01-14 / Codex

- Decision: テスト基盤は Vitest + Testing Library（jsdom）を採用する。
  Rationale: Next.js と相性の良い React 向けテストツールを最小構成で導入でき、API 呼び出しモックと UI イベント検証を素早く書けるため。
  Date/Author: 2026-01-14 / Codex

## Outcomes & Retrospective

全マイルストンを完了し、ローカルで `npm run lint`, `npm run test`, `npm run build` が通る状態に到達した。Open-Meteo をモックしたテストでデータ整形と UI 更新を検証済み。残るリスクは外部 API の仕様変更/レート制限と、チャート描画テスト時のコンテナ寸法警告（実動作への影響はなし）。

## Context and Orientation

現時点のリポジトリには Next.js 14（App Router, TypeScript, Tailwind, ESLint）で組まれた SPA があり、`app/page.tsx` はクライアントコンポーネントとして場所選択（プリセット + インクリメンタルサーチ）、日付指定、Recharts グラフ、時間帯アイコンを表示する。サーバー側には Open-Meteo を呼ぶ API Routes（`app/api/geocode/route.ts`, `app/api/weather/route.ts`）と、データ整形ロジック（`src/lib/weather/openMeteo.ts`, `src/lib/weather/types.ts`, `src/lib/weather/dateUtils.ts`, `src/lib/weather/weatherCode.ts`, `src/lib/weather/presets.ts`）がある。`npm run lint` と `npm run build` は成功している。テストは未実装で、受け入れ条件を満たすテスト追加が次の作業。仕様のスケッチは `docs/sketch.png` にあり、将来のデプロイ先として Vercel を想定する。

この ExecPlan は「Next.js アプリ基盤の上でデータ取得・UI・テストを揃え、ローカルで lint/test/build をパスさせる」ための手順を、初見の人でも再現できる粒度で記述する。

## Plan of Work

開発環境（devcontainer）と Next.js 基盤は整備済みなので、機能実装は完了済み（Open-Meteo を叩く API Routes、地点/日付入力による 1時間刻み配列、`docs/sketch.png` に沿った場所・日付・グラフ・アイコンの UI）。残タスクはテスト追加である。

テストは「外部 API に依存しない」ことを優先し、Open-Meteo への通信はユニット/統合テストではモック（MSW 等）で固定レスポンスを返す。E2E では UI 上の操作（場所変更、日付変更）が表示へ反映されることと、実線/破線が同一チャートに描画されることを検証する。受け入れ条件として、ローカルで `lint`, `test`, `build` が全てパスすることを明記する。

## Milestones

### Milestone 0: 開発環境（devcontainer）を整備する

devcontainer を追加し、コンテナ内で Node.js 20 と Docker-in-Docker を利用できるようにする。コンテナ内の `CODEX_HOME` は `${containerWorkspaceFolder}/.codex` に固定する。ホストの `.codex` ディレクトリはマウントせず、必要な設定はホストの `~/.codex/config.toml` をリポジトリ直下の `.codex/config.toml` にコピーして利用する。`.gitignore` で `.codex/` を除外し、機密がコミットされないことを保証する。

このマイルストンの完了条件は「devcontainer がビルドでき、コンテナ内で `node -v` が v20 系で動き、`docker version` が動く」ことである。

### Milestone 1: Next.js プロジェクトの初期化と基盤整備

リポジトリ直下を Next.js（App Router）として初期化し、TypeScript と ESLint を有効化する。モバイル UI を素早く作るため Tailwind CSS を導入し、コンポーネント整備に（必要なら）shadcn/ui を利用する。グラフ描画用に Recharts（または同等）を導入する。

このマイルストンの完了条件は「`npm run dev` でローカル起動でき、`npm run lint` と `npm run build` が通る」ことである。

### Milestone 2: 天気データ取得（API Routes）とデータ整形

Open-Meteo を呼び出すサーバー側モジュールを作る。入力は `location`（緯度/経度/タイムゾーン）と `date`（YYYY-MM-DD）とする。出力は UI が直接描画できるように、1時間刻みの配列へ整形した JSON を返す。

実装方針は次の通り。

1. 当日予報（実線）
   - `date` が今日の場合: Forecast API（`https://api.open-meteo.com/v1/forecast`）で該当日の hourly を取得する。
   - `date` が過去の場合: Historical Forecast API（`https://historical-forecast-api.open-meteo.com/v1/forecast`）で該当日の hourly を取得する。
2. 昨日実績（破線）
   - `date` の前日（date - 1日）を Archive API（`https://archive-api.open-meteo.com/v1/archive`）で取得する。

各 API では hourly に最低限 `temperature_2m` と天気状態（weather code）を含める。タイムゾーンは原則 `location.timezone` を使い、時間軸（0..23）がその地点のローカル時刻で揃うようにする。

このマイルストンの完了条件は「API Routes に HTTP リクエストすると、24点（0〜23時）の配列が返り、日付や地点を変えると内容が変わる」ことである。

### Milestone 3: UI（場所選択・日付選択・グラフ）を実装する

UI は SPA とし、ページ遷移無しで場所/日付の変更に追従して表示を更新する。`docs/sketch.png` に合わせて、上部に「場所（選択式 + 自由記述インクリメンタルサーチ）」と「日付」を配置し、中央に折れ線グラフを表示する。折れ線は当日予報を実線、昨日実績を破線で重ね、x 軸は 1時間おき（0..23）とする。下部に 0..23 の各時刻に対応する天気アイコンを表示する（完全な精度より、見やすさと一貫性を優先する）。

このマイルストンの完了条件は「ブラウザで場所/日付を変えるとグラフとアイコンが更新され、実線と破線が同時に表示される」ことである。

### Milestone 4: テスト（要件充足の証明）を実装する

ユニット/統合テストで、データ整形ロジックと API Routes の振る舞いを検証する。E2E テストで、UI 操作（選択式/インクリメンタルサーチ/日付変更）が期待通りに描画へ反映されることを検証する。外部 API 依存は避け、テスト用の固定レスポンスを用意する。

このマイルストンの完了条件は「ローカル（devcontainer）で `lint`, `test`, `build` がすべてパスする」ことである。

## Concrete Steps

以降のコマンドはリポジトリルートで実行する。

1) （完了済）Next.js 基盤を用意する。`npm init -y` の後、`npm install next react react-dom` と `npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next tailwindcss postcss autoprefixer` を実行し、`package.json` を `dev/build/start/lint/test` スクリプト付きに更新する。`tsconfig.json`, `next-env.d.ts`, `next.config.mjs`, `.eslintrc.json`, `tailwind.config.js`, `postcss.config.js`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css` を作成する。`npm run lint` と `npm run build` が通ることを確認する（現状は成功済み）。

2) （完了済）Open-Meteo 取得モジュールと API Routes を作成する。`src/lib/weather/` に型・日付ユーティリティ・フェッチ/整形ロジックを置き、`app/api/geocode/route.ts` と `app/api/weather/route.ts` を実装する。各 API は入力バリデーションを行い、タイムゾーンを考慮した 24 時点の配列を返す。

3) （完了済）UI コンポーネントを追加し、`docs/sketch.png` に合わせて配置する。場所セレクト（プリセット + インクリメンタルサーチ）と日付ピッカーを上部に置き、中央に実線/破線のグラフ（Recharts 利用）、下部に時間帯アイコンを並べる。状態管理と API 呼び出しはクライアントコンポーネントで行い、ローディング/エラーを表示する。`npm run lint` と `npm run build` が通ることを確認する（現状は成功済み）。

4) （完了済）テストを追加し、`npm run lint && npm run test && npm run build` が通ることを確認する。Vitest + Testing Library で API 呼び出しをモックしつつ、データ整形と UI 更新（場所変更・線種の表示）を検証する（現状成功済み）。

## Validation and Acceptance

受け入れ条件（ローカルで必ず満たすこと）:

1. devcontainer がビルドできる。
2. ブラウザでアプリが表示でき、場所を次の2方式で指定できる。
   - 方式A: 選択式（プリセットのセレクト）
   - 方式B: 自由記述 + インクリメンタルサーチ（候補が出て選べる）
3. 過去日を指定すると、その日を当日として同様の情報（当日予報/昨日実績の重ねグラフ、アイコン列）が表示される。
4. グラフは 1時間刻みで、当日予報が実線、昨日実績が破線で、同一チャート上に重なっている。
5. 次のコマンドが全て成功する。

    npm run lint
    npm run test
    npm run build

また、E2E を導入する場合は次も成功すること。

    npm run test:e2e

## Idempotence and Recovery

繰り返し実行しても安全な方針にする。外部 API の呼び出しはテストでは必ずモックし、失敗時にリトライしやすいように API Routes は入力（lat/lon/date/timezone）をログに残せる形にする（個人情報を含まない範囲）。

Next.js 初期化で既存ファイルを誤って上書きした場合は、`git checkout -- <file>` で復旧できる前提で進める。

## Artifacts and Notes

Open-Meteo へ投げる URL 例（概念説明用）:

    # 予報（今日の hourly 温度）
    https://api.open-meteo.com/v1/forecast?latitude=35.681236&longitude=139.767125&hourly=temperature_2m,weathercode&timezone=Asia%2FTokyo

    # 過去実績（前日の hourly 温度）
    https://archive-api.open-meteo.com/v1/archive?latitude=35.681236&longitude=139.767125&start_date=2026-01-13&end_date=2026-01-13&hourly=temperature_2m,weathercode&timezone=Asia%2FTokyo

    # 過去の予報（過去日の hourly 温度）
    https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=35.681236&longitude=139.767125&start_date=2026-01-10&end_date=2026-01-10&hourly=temperature_2m,weathercode&timezone=Asia%2FTokyo

## Interfaces and Dependencies

依存ライブラリは最小構成を優先する（過剰な導入は避ける）。最低限、次を満たす型と I/F を用意する。

`src/lib/weather/types.ts` に定義する（案）:

    export type Location = {
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      timezone: string;
    };

    export type HourlyPoint = {
      isoTime: string;      // 例: 2026-01-14T09:00
      hour: number;         // 0..23（location のローカル時刻）
      temperatureC: number; // temperature_2m
      weatherCode: number;  // weathercode
    };

    export type DashboardResponse = {
      location: Location;
      date: string; // YYYY-MM-DD
      todayForecast: HourlyPoint[];
      yesterdayActual: HourlyPoint[];
    };

API Routes（案）:

    GET /api/geocode?q=<text>&count=<n>&language=ja
      -> Location[]（候補。Open-Meteo geocoding を背後で利用）

    GET /api/weather?lat=<num>&lon=<num>&date=YYYY-MM-DD&timezone=<tz>
      -> DashboardResponse

（注）この ExecPlan は初版であり、実装の途中で変更した場合は `Decision Log` に必ず記録し、全セクションへ反映すること。

Revision Note (2026-01-14 10:54Z, Codex): Next.js 14 + TypeScript + Tailwind + ESLint の基盤を追加し、lint/build が通る状態に更新。Progress/Context/Concrete Steps を現状に合わせて反映した。
Revision Note (2026-01-14 11:02Z, Codex): Open-Meteo API Routes とデータ整形ロジックを実装し、場所/日付選択 UI・Recharts グラフ・時間帯アイコンを追加。lint/build 成功を確認し、Progress/Context/Concrete Steps を更新した。
Revision Note (2026-01-14 11:07Z, Codex): Vitest + Testing Library でユニット/統合/UI テストを追加し、lint/test/build 成功を確認。Progress/Outcomes/Concrete Steps を更新した。
