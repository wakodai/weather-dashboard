export type Location = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type HourlyPoint = {
  isoTime: string; // e.g., 2026-01-14T09:00
  hour: number; // 0..23, local hour in timezone
  temperatureC: number;
  weatherCode: number;
};

export type DashboardResponse = {
  location: Location;
  date: string; // YYYY-MM-DD
  todayForecast: HourlyPoint[];
  yesterdayActual: HourlyPoint[];
};
