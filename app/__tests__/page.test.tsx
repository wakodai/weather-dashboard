import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HomePage from "../page";
import { PRESET_LOCATIONS } from "@/lib/weather/presets";
import { DashboardResponse } from "@/lib/weather/types";

const sampleForecast = [
  { isoTime: "2024-01-10T00:00", hour: 0, temperatureC: 3, weatherCode: 2 },
  { isoTime: "2024-01-10T03:00", hour: 3, temperatureC: 2, weatherCode: 3 },
  { isoTime: "2024-01-10T06:00", hour: 6, temperatureC: 0, weatherCode: 2 },
  { isoTime: "2024-01-10T09:00", hour: 9, temperatureC: 6, weatherCode: 1 },
  { isoTime: "2024-01-10T12:00", hour: 12, temperatureC: 10, weatherCode: 0 }
];

const sampleActual = [
  { isoTime: "2024-01-09T00:00", hour: 0, temperatureC: 1, weatherCode: 61 },
  { isoTime: "2024-01-09T03:00", hour: 3, temperatureC: 0, weatherCode: 63 },
  { isoTime: "2024-01-09T06:00", hour: 6, temperatureC: -1, weatherCode: 63 }
];

const baseDashboard: DashboardResponse = {
  location: PRESET_LOCATIONS[0],
  date: "2024-01-10",
  todayForecast: sampleForecast,
  yesterdayActual: sampleActual
};

const buildFetchMock = () =>
  vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/api/weather")) {
      const params = new URL(url, "http://localhost").searchParams;
      const lat = Number(params.get("lat") ?? 0);
      const lon = Number(params.get("lon") ?? 0);
      const timezone = params.get("timezone") ?? "UTC";
      const name = params.get("name") ?? "Mock";
      const body: DashboardResponse = {
        ...baseDashboard,
        location: {
          id: `${lat},${lon}`,
          name,
          latitude: lat,
          longitude: lon,
          timezone
        },
        date: params.get("date") ?? baseDashboard.date
      };
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      );
    }

    if (url.includes("/api/geocode")) {
      return Promise.resolve(
        new Response(
          JSON.stringify([
            {
              id: "osaka",
              name: "Osaka, Japan",
              latitude: 34.6937,
              longitude: 135.5023,
              timezone: "Asia/Tokyo"
            }
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        )
      );
    }

    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });

describe("HomePage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", buildFetchMock() as unknown as typeof fetch);
    vi.setSystemTime(new Date("2026-01-14T00:00:00Z"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders default location and weather icons from API response", async () => {
    render(<HomePage />);

    const locations = await screen.findAllByText(/東京, 日本/);
    expect(locations.length).toBeGreaterThan(0);
    expect(await screen.findByText("Timeline")).toBeInTheDocument();
    expect(await screen.findByText("☀️")).toBeInTheDocument();
    const rainChances = await screen.findAllByText(/0%/);
    expect(rainChances.length).toBeGreaterThan(0);
  });

  test("changing preset triggers fetch and updates location text", async () => {
    render(<HomePage />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "london" } });

    await waitFor(() => {
      const labels = screen.getAllByText(/London, UK/);
      expect(labels.length).toBeGreaterThan(0);
    });

    const fetchMock = global.fetch as unknown as vi.Mock;
    const calledWithLondon = fetchMock.mock.calls.some((call) => {
      const url = call[0] as string;
      return url.includes("lat=51.5074") && url.includes("lon=-0.1278");
    });
    expect(calledWithLondon).toBe(true);
  });
});
