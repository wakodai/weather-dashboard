"use client";

import { useEffect, useMemo, useState } from "react";
import { TemperatureChart } from "@/components/TemperatureChart";
import { formatDateInTimezone } from "@/lib/weather/dateUtils";
import { PRESET_LOCATIONS } from "@/lib/weather/presets";
import { describeWeatherCode } from "@/lib/weather/weatherCode";
import { DashboardResponse, HourlyPoint, Location } from "@/lib/weather/types";

type FetchState = "idle" | "loading" | "error";

type ChartDatum = {
  order: number;
  hour: number;
  label?: string;
  forecast?: number | null;
  actual?: number | null;
};

const formatHourLabel = (hour: number) => hour.toString().padStart(2, "0");

const mergeSeries = (
  forecast: HourlyPoint[],
  actual: HourlyPoint[]
): Omit<ChartDatum, "order" | "label">[] => {
  const byHour = new Map<number, Omit<ChartDatum, "order" | "label">>();
  forecast.forEach((p) => {
    byHour.set(p.hour, { hour: p.hour, forecast: p.temperatureC, actual: null });
  });
  actual.forEach((p) => {
    const existing = byHour.get(p.hour) ?? { hour: p.hour };
    byHour.set(p.hour, { ...existing, actual: p.temperatureC });
  });
  return Array.from(byHour.values()).sort((a, b) => a.hour - b.hour);
};

const currentHourInTimezone = (timezone: string): number => {
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
    return Number(hour);
  } catch {
    return new Date().getHours();
  }
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
  const [startFromNow, setStartFromNow] = useState(false);

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
    const merged = mergeSeries(dashboard.todayForecast, dashboard.yesterdayActual).map(
      (item, idx) => ({
        ...item,
        order: idx,
        label: `${formatHourLabel(item.hour)}時`
      })
    );

    if (!startFromNow) return merged;

    const startHour = currentHourInTimezone(selectedLocation.timezone);
    const startIndex = merged.findIndex((d) => d.hour >= startHour);
    const pivot = startIndex === -1 ? 0 : startIndex;
    const rotated = merged.slice(pivot).concat(merged.slice(0, pivot));
    return rotated.map((item, idx) => ({ ...item, order: idx }));
  }, [dashboard, startFromNow, selectedLocation.timezone]);

  const timelineIcons = useMemo(() => {
    if (!dashboard) return [];
    return dashboard.todayForecast
      .filter((_, idx) => idx % 3 === 0)
      .map((point) => ({
        point,
        descriptor: describeWeatherCode(point.weatherCode)
      }));
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
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/30 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(244,114,182,0.18),transparent_35%),radial-gradient(circle_at_20%_100%,rgba(52,211,153,0.15),transparent_30%)]" />
          <div className="relative space-y-6 p-6 md:p-8">
            <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-200/80">
                  Weather
                </p>
                <h1 className="text-3xl font-semibold text-white drop-shadow-sm">
                  {selectedLocation.name}
                </h1>
                <p className="text-sm text-slate-200/80">
                  {date} · {selectedLocation.timezone}
                </p>
                <p className="text-xs text-slate-400">
                  {selectedLocation.latitude.toFixed(2)}, {selectedLocation.longitude.toFixed(2)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs">
                {loading === "loading" && (
                  <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-cyan-100 shadow-sm">
                    更新中...
                  </span>
                )}
                {error && (
                  <span className="rounded-lg border border-rose-500/60 bg-rose-500/15 px-3 py-2 text-rose-100 shadow-sm">
                    {error}
                  </span>
                )}
              </div>
            </header>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-slate-300">
                  Preset
                </label>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 shadow-inner shadow-black/30 backdrop-blur">
                  <select
                    value={selectedLocation.id}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-100 outline-none"
                  >
                    {PRESET_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.id} className="bg-slate-900 text-slate-100">
                        {loc.name}
                      </option>
                    ))}
                    {isCustomLocation && (
                      <option value={selectedLocation.id} className="bg-slate-900 text-slate-100">
                        {selectedLocation.name}（検索結果）
                      </option>
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.2em] text-slate-300">
                  Search
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="地名を入力（Osaka, Paris, Seoul ...）"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-black/30 outline-none backdrop-blur placeholder:text-slate-400"
                  />
                  <div className="space-y-1">
                    {searchState === "loading" && (
                      <p className="text-[11px] text-cyan-200">検索中...</p>
                    )}
                    {searchState === "error" && (
                      <p className="text-[11px] text-rose-200">検索に失敗しました。</p>
                    )}
                    {searchResults.length > 0 && (
                      <ul className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-slate-900/70 shadow-lg shadow-black/40">
                        {searchResults.map((loc) => (
                          <li key={loc.id}>
                            <button
                              type="button"
                              onClick={() => handleSearchSelect(loc)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-100 hover:bg-white/5"
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
              </div>

              <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.2em] text-slate-300">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-black/30 outline-none backdrop-blur"
            />
            <p className="text-[11px] text-slate-400">
              過去日も指定できます。指定日を「当日」とみなし、昨日の実績を破線で重ねます。
            </p>
            <label className="mt-1 flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={startFromNow}
                onChange={(e) => setStartFromNow(e.target.checked)}
                className="h-4 w-4 rounded border-white/30 bg-white/10 accent-cyan-400"
              />
              <span className="text-xs text-slate-200">現在時刻を左端にして表示</span>
            </label>
          </div>
        </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/40 backdrop-blur">
              <TemperatureChart data={chartData} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/40 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/80">
                    Timeline
                  </p>
                  <p className="text-sm text-slate-200/80">3時間ごとの天気と降水確率</p>
                </div>
                {dashboard && (
                  <span className="text-xs text-slate-400">
                    {dashboard.date} / {dashboard.location.timezone}
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {timelineIcons.map(({ point, descriptor }) => (
                  <div
                    key={`${point.isoTime}-${point.hour}`}
                    className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center shadow-sm shadow-black/30"
                  >
                    <span className="text-xs text-slate-300">{formatHourLabel(point.hour)}時</span>
                    <span className="text-2xl drop-shadow">{descriptor.emoji}</span>
                    <span className="text-[11px] text-slate-200">{descriptor.label}</span>
                    <span className="text-[11px] text-cyan-200">{descriptor.rainChance}%</span>
                  </div>
                ))}
                {timelineIcons.length === 0 && (
                  <p className="col-span-full text-sm text-slate-300">
                    地点と日付を選ぶとタイムラインを表示します。
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
