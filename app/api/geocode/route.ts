import { NextRequest, NextResponse } from "next/server";
import { searchLocations } from "@/lib/weather/openMeteo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const language = searchParams.get("language") ?? "en";
  const countParam = searchParams.get("count") ?? "5";
  const countValue = Number.parseInt(countParam, 10);
  const count = Number.isFinite(countValue)
    ? Math.min(Math.max(countValue, 1), 10)
    : 5;

  if (!q) {
    return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
  }

  try {
    const results = await searchLocations(q, count, language);
    return NextResponse.json(results, { status: 200 });
  } catch (err) {
    console.error("geocode search failed", err);
    return NextResponse.json(
      { error: "Failed to search locations" },
      { status: 502 }
    );
  }
}
