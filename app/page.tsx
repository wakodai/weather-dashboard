"use client";

import { useEffect, useMemo, useState } from "react";
import { TemperatureChart } from "@/components/TemperatureChart";
import { formatDateInTimezone, shiftDate } from "@/lib/weather/dateUtils";
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

const sortByIsoTime = (points: HourlyPoint[]) =>
  [...points].sort((a, b) => (a.isoTime > b.isoTime ? 1 : -1));

const extractDate = (isoTime: string) => isoTime.slice(0, 10);

const sliceForecastWindow = ({
  forecast,
  baseDate,
  startHour,
  startFromNow
}: {
  forecast: HourlyPoint[];
  baseDate: string;
  startHour: number;
  startFromNow: boolean;
}): HourlyPoint[] => {
  const sorted = sortByIsoTime(forecast);
  const baseDayPoints = sorted.filter((p) => p.isoTime.startsWith(baseDate));
  const baseWindow = baseDayPoints.length > 0 ? baseDayPoints : sorted;

  if (!startFromNow) {
    return baseWindow.slice(0, 24);
  }

  // start-from-now は翌日分も含んだ全体順序（sorted）で 24h ウィンドウを形成する
  const startIdx = sorted.findIndex(
    (p) => p.isoTime.startsWith(baseDate) && p.hour >= startHour
  );
  const pivot =
    startIdx >= 0
      ? startIdx
      : sorted.findIndex((p) => p.isoTime.startsWith(baseDate));
  const safePivot = pivot >= 0 ? pivot : 0;
  const window: HourlyPoint[] = [];
  for (let i = 0; i < 24 && i < sorted.length; i += 1) {
    const idx = (safePivot + i) % sorted.length;
    window.push(sorted[idx]);
  }
  return window;
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
    const baseDate = dashboard.date;
    const startHour = currentHourInTimezone(selectedLocation.timezone);
    const forecastWindow = sliceForecastWindow({
      forecast: dashboard.todayForecast,
      baseDate,
      startHour,
      startFromNow
    });
    const actualWindow = dashboard.yesterdayActual;
    const actualByDateHour = new Map<string, number>();
    actualWindow.forEach((p) => {
      actualByDateHour.set(`${extractDate(p.isoTime)}-${p.hour}`, p.temperatureC);
    });
    const nextDate = shiftDate(baseDate, 1);

    return forecastWindow.map((point, idx) => {
      const isNextDay = point?.isoTime.startsWith(nextDate);
      const prevDate = isNextDay ? baseDate : shiftDate(baseDate, -1);
      const actualKey = `${prevDate}-${point.hour}`;
      const suffix = isNextDay ? " (+1)" : "";
      return {
        order: idx,
        hour: point.hour,
        forecast: point.temperatureC,
        actual: actualByDateHour.get(actualKey) ?? null,
        label: `${formatHourLabel(point.hour)}時${suffix}`
      };
    });
  }, [dashboard, startFromNow, selectedLocation.timezone]);

  const timelineIcons = useMemo(() => {
    if (!dashboard) return [];
    const baseDate = dashboard.date;
    const startHour = currentHourInTimezone(selectedLocation.timezone);
    const windowed = sliceForecastWindow({
      forecast: dashboard.todayForecast,
      baseDate,
      startHour,
      startFromNow
    });
    return windowed
      .filter((_, idx) => idx % 3 === 0)
      .map((point) => ({
        point,
        descriptor: describeWeatherCode(point.weatherCode)
      }));
  }, [dashboard, selectedLocation.timezone, startFromNow]);

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
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Weather Dashboard</p>
          <h1 className="text-3xl font-semibold text-slate-900">{selectedLocation.name}</h1>
          <p className="text-sm text-slate-600">
            {date} · {selectedLocation.timezone}
          </p>
          <p className="text-xs text-slate-500">
            {selectedLocation.latitude.toFixed(2)}, {selectedLocation.longitude.toFixed(2)}
          </p>
          {error && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {error}
            </div>
          )}
          {loading === "loading" && (
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              更新中...
            </div>
          )}
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">プリセット</label>
              <select
                value={selectedLocation.id}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
              >
                {PRESET_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
                {isCustomLocation && (
                  <option value={selectedLocation.id}>{selectedLocation.name}（検索結果）</option>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">検索</label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="地名を入力（Osaka, Paris, Seoul ...）"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300 placeholder:text-slate-400"
                />
                <div className="space-y-1">
                  {searchState === "loading" && (
                    <p className="text-[11px] text-slate-500">検索中...</p>
                  )}
                  {searchState === "error" && (
                    <p className="text-[11px] text-rose-500">検索に失敗しました。</p>
                  )}
                  {searchResults.length > 0 && (
                    <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      {searchResults.map((loc) => (
                        <li key={loc.id}>
                          <button
                            type="button"
                            onClick={() => handleSearchSelect(loc)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-50"
                          >
                            <span>{loc.name}</span>
                            <span className="text-xs text-slate-500">
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
              <label className="text-xs font-semibold text-slate-700">日付</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-300"
              />
              <p className="text-[11px] text-slate-500">
                過去日も指定できます。指定日を「当日」とみなし、昨日の実績を破線で重ねます。
              </p>
              <label className="mt-1 flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={startFromNow}
                  onChange={(e) => setStartFromNow(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-slate-700 focus:ring-1 focus:ring-slate-400"
                />
                <span>現在時刻を左端にして表示</span>
              </label>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Chart</p>
              <p className="text-sm text-slate-700">予報（実線）と昨日実績（破線）</p>
            </div>
            {dashboard && (
              <span className="text-xs text-slate-500">
                {dashboard.date} / {dashboard.location.timezone}
              </span>
            )}
          </div>
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <TemperatureChart data={chartData} />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Timeline</p>
              <p className="text-sm text-slate-700">3時間ごとの天気と降水確率</p>
            </div>
            {dashboard && (
              <span className="text-xs text-slate-500">
                {dashboard.date} / {dashboard.location.timezone}
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {timelineIcons.map(({ point, descriptor }) => (
              <div
                key={`${point.isoTime}-${point.hour}`}
                className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center shadow-sm"
              >
                <span className="text-xs text-slate-500">{formatHourLabel(point.hour)}時</span>
                <span className="text-2xl">{descriptor.emoji}</span>
                <span className="text-[11px] text-slate-700">{descriptor.label}</span>
                <span className="text-[11px] text-slate-500">{descriptor.rainChance}%</span>
              </div>
            ))}
            {timelineIcons.length === 0 && (
              <p className="col-span-full text-sm text-slate-600">
                地点と日付を選ぶとタイムラインを表示します。
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
