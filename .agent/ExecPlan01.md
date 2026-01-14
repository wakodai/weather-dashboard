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
- [ ] プロジェクトを Next.js（TypeScript）として初期化し、lint/test/build の基本導線を作る。
- [ ] 位置検索（インクリメンタルサーチ）と、プリセット選択（選択式）の両方で地点を指定できるようにする。
- [ ] 日付を指定して「その日を当日として」同じ情報を表示できるようにする（過去日含む）。
- [ ] グラフ要件（実線=当日予報、破線=昨日実績、1時間刻み、重ね描画）を満たす UI を実装する。
- [ ] 受け入れ条件を満たすテスト（ユニット/統合/E2E）を実装し、`lint`, `test`, `build` がローカルで全てパスすることを確認する。

## Surprises & Discoveries

- Observation: Open-Meteo には「予報」「過去実績（アーカイブ）」「過去の予報（historical forecast）」「地名→緯度経度（ジオコーディング）」が揃っており、API キー無し・低コストで要件を満たしやすい。
  Evidence: 代表的なエンドポイントは次の通り。
    - 予報: `https://api.open-meteo.com/v1/forecast`
    - 過去実績: `https://archive-api.open-meteo.com/v1/archive`
    - 過去の予報: `https://historical-forecast-api.open-meteo.com/v1/forecast`
    - ジオコーディング: `https://geocoding-api.open-meteo.com/v1/search`

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

## Outcomes & Retrospective

（未着手）

## Context and Orientation

現時点のリポジトリは最小構成で、アプリ本体（Next.js）はまだ存在しない。仕様のスケッチは `docs/sketch.png` にある。実装は SPA で構成し、将来のデプロイ先として Vercel を想定する。

この ExecPlan は「これから Next.js アプリを立ち上げ、データ取得・UI・テストを揃え、ローカルで lint/test/build をパスさせる」ための手順を、初見の人でも再現できる粒度で記述する。

## Plan of Work

最初に開発環境（devcontainer）を整備し、コンテナ内で Node.js（npx を含む）と Docker（Supabase ローカル等で必要）を扱えるようにする。次に Next.js（TypeScript + React）をリポジトリ直下に初期化し、最低限の lint/test/build コマンドを確立する。

アプリのデータ取得は「地点（緯度/経度/タイムゾーン）」「日付（YYYY-MM-DD）」を入力として、サーバー側の API Routes が Open-Meteo へ問い合わせ、UI が扱いやすい JSON（1時間刻みの配列）へ整形して返す。UI は `docs/sketch.png` の通り、上部で場所と日付を指定でき、中央に当日予報（実線）と昨日実績（破線）の重ねグラフを表示し、下部に時間帯の天気状態（アイコン）を並べる。

テストは「外部 API に依存しない」ことを優先し、Open-Meteo への通信はユニット/統合テストではモック（MSW 等）で固定レスポンスを返す。E2E では UI 上の操作（場所変更、日付変更）で表示が更新されること、実線/破線の描画が行われることを検証する。受け入れ条件として、ローカルで `lint`, `test`, `build` が全てパスすることを明記する。

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

1) devcontainer を起動する（VS Code の “Reopen in Container” を想定）。

2) Next.js を初期化する（既存ファイルがあるため、対話プロンプトが出た場合は上書きしない方針を選ぶ）。

    npm init -y
    npm install next react react-dom
    npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next

（注）このフェーズは create-next-app を使ってもよいが、既存ファイル（`AGENTS.md`, `.agent/PLANS.md`, `docs/`）を壊さないことを最優先とする。

3) Open-Meteo 取得モジュールと API Routes を作成する。

4) UI コンポーネントを追加し、`docs/sketch.png` に合わせて配置する。

5) テストを追加し、lint/test/build を通す。

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
