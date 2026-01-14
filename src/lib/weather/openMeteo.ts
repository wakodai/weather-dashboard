import { formatDateInTimezone, shiftDate } from "./dateUtils";
import { DashboardResponse, HourlyPoint, Location } from "./types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const HISTORICAL_FORECAST_URL =
  "https://historical-forecast-api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const HOURLY_QUERY = "temperature_2m,weathercode";

type HourlyBlock = {
  time?: string[];
  temperature_2m?: number[];
  weathercode?: number[];
};

type ForecastResponse = {
  hourly?: HourlyBlock;
};

type GeocodingResult = {
  id?: number;
  name?: string;
  country?: string;
  admin1?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
};

type GeocodingResponse = {
  results?: GeocodingResult[];
};

const formatHour = (isoTime: string): number => {
  const hourPart = isoTime.slice(11, 13);
  const parsed = Number.parseInt(hourPart, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapHourly = (hourly: HourlyBlock): HourlyPoint[] => {
  const times = hourly.time ?? [];
  const temps = hourly.temperature_2m ?? [];
  const codes = hourly.weathercode ?? [];
  const length = Math.min(times.length, temps.length, codes.length);
  const points: HourlyPoint[] = [];

  for (let i = 0; i < length; i += 1) {
    const isoTime = times[i];
    points.push({
      isoTime,
      hour: formatHour(isoTime),
      temperatureC: temps[i],
      weatherCode: codes[i]
    });
  }
  return points;
};

const buildUrl = (base: string, params: Record<string, string | number>) => {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  return url.toString();
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
};

export const searchLocations = async (
  query: string,
  count = 5,
  language = "en"
): Promise<Location[]> => {
  const url = buildUrl(GEOCODING_URL, {
    name: query,
    count,
    language
  });
  const data = await fetchJson<GeocodingResponse>(url);
  const results = data.results ?? [];
  return results.map((item) => {
    const { id, name, country, admin1, latitude, longitude, timezone } = item;
    const labelParts = [name, admin1, country].filter(Boolean);
    return {
      id: String(id ?? `${name}-${latitude}-${longitude}`),
      name: labelParts.join(", "),
      latitude: latitude ?? 0,
      longitude: longitude ?? 0,
      timezone: timezone ?? "UTC"
    };
  });
};

const fetchHourly = async (
  baseUrl: string,
  params: {
    latitude: number;
    longitude: number;
    timezone: string;
    start_date: string;
    end_date: string;
  }
): Promise<HourlyPoint[]> => {
  const url = buildUrl(baseUrl, {
    latitude: params.latitude,
    longitude: params.longitude,
    start_date: params.start_date,
    end_date: params.end_date,
    hourly: HOURLY_QUERY,
    timezone: params.timezone
  });
  const data = await fetchJson<ForecastResponse>(url);
  return mapHourly(data.hourly ?? {});
};

const fetchForecastForDate = async (args: {
  latitude: number;
  longitude: number;
  timezone: string;
  date: string;
}): Promise<HourlyPoint[]> => {
  const today = formatDateInTimezone(args.timezone);
  const isPast = args.date < today;
  const baseUrl = isPast ? HISTORICAL_FORECAST_URL : FORECAST_URL;
  return fetchHourly(baseUrl, {
    latitude: args.latitude,
    longitude: args.longitude,
    timezone: args.timezone,
    start_date: args.date,
    end_date: shiftDate(args.date, 1)
  });
};

const fetchArchiveForDate = async (args: {
  latitude: number;
  longitude: number;
  timezone: string;
  date: string;
}): Promise<HourlyPoint[]> => {
  return fetchHourly(ARCHIVE_URL, {
    latitude: args.latitude,
    longitude: args.longitude,
    timezone: args.timezone,
    start_date: args.date,
    end_date: args.date
  });
};

const fetchArchiveForRange = async (args: {
  latitude: number;
  longitude: number;
  timezone: string;
  startDate: string;
  endDate: string;
}): Promise<HourlyPoint[]> => {
  return fetchHourly(ARCHIVE_URL, {
    latitude: args.latitude,
    longitude: args.longitude,
    timezone: args.timezone,
    start_date: args.startDate,
    end_date: args.endDate
  });
};

export const fetchDashboard = async (args: {
  location: Location;
  date: string;
}): Promise<DashboardResponse> => {
  const { location, date } = args;
  const todayForecast = await fetchForecastForDate({
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone,
    date
  });

  const yesterdayDate = shiftDate(date, -1);
  const yesterdayActual = await fetchArchiveForRange({
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone,
    startDate: yesterdayDate,
    endDate: date
  });

  return {
    location,
    date,
    todayForecast,
    yesterdayActual
  };
};
