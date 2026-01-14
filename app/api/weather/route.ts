import { NextRequest, NextResponse } from "next/server";
import { fetchDashboard } from "@/lib/weather/openMeteo";
import { Location } from "@/lib/weather/types";

export const dynamic = "force-dynamic";

const isValidDate = (value: string | null): value is string => {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
};

const parseNumber = (value: string | null): number | null => {
  if (value === null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseNumber(searchParams.get("lat"));
  const lon = parseNumber(searchParams.get("lon"));
  const timezone = searchParams.get("timezone");
  const date = searchParams.get("date");
  const name = searchParams.get("name") ?? "Selected location";

  if (lat === null || lon === null || !timezone || !isValidDate(date)) {
    return NextResponse.json(
      { error: "Required parameters: lat, lon, timezone, date(YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const location: Location = {
    id: `${lat},${lon}`,
    name,
    latitude: lat,
    longitude: lon,
    timezone
  };

  try {
    const dashboard = await fetchDashboard({ location, date });
    return NextResponse.json(dashboard, { status: 200 });
  } catch (err) {
    console.error("weather fetch failed", err);
    return NextResponse.json(
      { error: "Failed to fetch weather data" },
      { status: 502 }
    );
  }
}
