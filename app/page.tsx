"use client";

import { useEffect, useMemo, useState } from "react";
import { TemperatureChart } from "@/components/TemperatureChart";
import { formatDateInTimezone } from "@/lib/weather/dateUtils";
import { PRESET_LOCATIONS } from "@/lib/weather/presets";
import { describeWeatherCode } from "@/lib/weather/weatherCode";
import { DashboardResponse, HourlyPoint, Location } from "@/lib/weather/types";

type FetchState = "idle" | "loading" | "error";

type ChartDatum = {
  hour: number;
  forecast?: number | null;
  actual?: number | null;
};

const mergeSeries = (
  forecast: HourlyPoint[],
  actual: HourlyPoint[]
): ChartDatum[] => {
  const byHour = new Map<number, ChartDatum>();
  forecast.forEach((p) => {
    byHour.set(p.hour, { hour: p.hour, forecast: p.temperatureC, actual: null });
  });
  actual.forEach((p) => {
    const existing = byHour.get(p.hour) ?? { hour: p.hour };
    byHour.set(p.hour, { ...existing, actual: p.temperatureC });
  });
  return Array.from(byHour.values()).sort((a, b) => a.hour - b.hour);
};

const defaultLocation = PRESET_LOCATIONS[0];

export default function HomePage() {
  const [selectedLocation, setSelectedLocation] = useState<Location>(defaultLocation);
  const [date, setDate] = useState<string>(
    formatDateInTimezone(defaultLocation.timezone)
  );
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [searchState, setSearchState] = useState<FetchState>("idle");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading("loading");
      setError(null);
      try {
        const params = new URLSearchParams({
          lat: String(selectedLocation.latitude),
          lon: String(selectedLocation.longitude),
          timezone: selectedLocation.timezone,
          date,
          name: selectedLocation.name
        });
        const res = await fetch(`/api/weather?${params.toString()}`, {
          cache: "no-store"
        });
        if (!res.ok) {
          throw new Error(`API error (${res.status})`);
        }
        const data = (await res.json()) as DashboardResponse;
        if (!cancelled) {
          setDashboard(data);
          setLoading("idle");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "天気データの取得に失敗しました。"
          );
          setLoading("error");
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedLocation, date]);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setSearchState("idle");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchState("loading");
      try {
        const params = new URLSearchParams({
          q: searchTerm.trim(),
          language: "ja",
          count: "5"
        });
        const res = await fetch(`/api/geocode?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal
        });
        if (!res.ok) {
          throw new Error(`Geocode error (${res.status})`);
        }
        const data = (await res.json()) as Location[];
        setSearchResults(data);
        setSearchState("idle");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSearchState("error");
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const chartData = useMemo(() => {
    if (!dashboard) return [];
    return mergeSeries(dashboard.todayForecast, dashboard.yesterdayActual);
  }, [dashboard]);

  const forecastIcons = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.todayForecast;
  }, [dashboard]);

  const handlePresetChange = (id: string) => {
    const preset = PRESET_LOCATIONS.find((p) => p.id === id);
    if (preset) {
      setSelectedLocation(preset);
    }
  };

  const handleSearchSelect = (location: Location) => {
    setSelectedLocation(location);
    setSearchTerm(location.name);
    setSearchResults([]);
  };

  const isCustomLocation = useMemo(
    () => !PRESET_LOCATIONS.some((loc) => loc.id === selectedLocation.id),
    [selectedLocation]
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
          Weather Dashboard
        </p>
        <h1 className="text-3xl font-bold text-white">
          当日予報と昨日実績を重ねて見る、モバイルファースト天気ダッシュボード
        </h1>
        <p className="text-sm text-slate-300">
          地点と日付を選ぶと、当日の予報（実線）と昨日の実績（破線）を 1 時間刻みで比較表示します。
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg md:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-200">
            プリセットから選ぶ
          </label>
          <div className="relative">
            <select
              value={selectedLocation.id}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
            >
              {PRESET_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
              {isCustomLocation && (
                <option value={selectedLocation.id}>
                  {selectedLocation.name}（検索結果）
                </option>
              )}
            </select>
          </div>
          <p className="text-xs text-slate-400">
            緯度経度・タイムゾーン付きのプリセット地点です。検索結果を選ぶと一時的にここへ追加されます。
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-200">
            インクリメンタルサーチ
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="地名を入力（例: Osaka, Paris, Seoul）"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
          />
          <div className="space-y-2">
            {searchState === "loading" && (
              <p className="text-xs text-cyan-300">検索中...</p>
            )}
            {searchState === "error" && (
              <p className="text-xs text-rose-300">検索に失敗しました。</p>
            )}
            {searchResults.length > 0 && (
              <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80">
                {searchResults.map((loc) => (
                  <li key={loc.id}>
                    <button
                      type="button"
                      onClick={() => handleSearchSelect(loc)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-100 hover:bg-slate-800"
                    >
                      <span>{loc.name}</span>
                      <span className="text-xs text-slate-400">
                        {loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-200">
            日付を指定
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
          />
          <p className="text-xs text-slate-400">
            過去日も指定できます。指定日を「当日」とみなし、その昨日の実績を破線で重ねます。
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-200">
            選択中の地点
          </label>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-100">
            <p className="font-semibold">{selectedLocation.name}</p>
            <p className="text-slate-300">
              {selectedLocation.latitude.toFixed(2)}, {selectedLocation.longitude.toFixed(2)} / {selectedLocation.timezone}
            </p>
            <p className="text-xs text-slate-400">
              0時〜23時はこのタイムゾーン基準で表示します。
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              Chart
            </p>
            <h2 className="text-xl font-semibold text-white">
              当日予報（実線）と昨日実績（破線）
            </h2>
            <p className="text-sm text-slate-300">
              1時間刻みで 0〜23 時を描画します。線をタップ/ホバーすると温度が表示されます。
            </p>
          </div>
          {loading === "loading" && (
            <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs text-cyan-200">
              更新中...
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-rose-500/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        <TemperatureChart data={chartData} />
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              Icons
            </p>
            <h2 className="text-xl font-semibold text-white">時間帯の天気</h2>
            <p className="text-sm text-slate-300">
              当日予報の weather code から見やすい簡易アイコンを生成しています。
            </p>
          </div>
          {dashboard && (
            <span className="text-xs text-slate-400">
              {dashboard.date} / {dashboard.location.timezone}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {forecastIcons.map((point) => {
            const descriptor = describeWeatherCode(point.weatherCode);
            return (
              <div
                key={`${point.isoTime}-${point.hour}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-center"
              >
                <span className="text-xs text-slate-400">{point.hour}時</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-cyan-100">
                  {descriptor.symbol}
                </div>
                <div className="text-xs text-slate-200">{descriptor.label}</div>
                <div className="text-xs text-slate-400">
                  {point.temperatureC.toFixed(1)}℃ 
                </div>
              </div>
            );
          })}
          {forecastIcons.length === 0 && (
            <p className="text-sm text-slate-400">
              地点と日付を選ぶとアイコンを表示します。
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
