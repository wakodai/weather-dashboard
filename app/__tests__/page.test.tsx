import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HomePage from "../page";
import { PRESET_LOCATIONS } from "@/lib/weather/presets";
import { DashboardResponse } from "@/lib/weather/types";

const sampleForecast = [
  { isoTime: "2024-01-10T00:00", hour: 0, temperatureC: 10, weatherCode: 0 },
  { isoTime: "2024-01-10T01:00", hour: 1, temperatureC: 11, weatherCode: 1 }
];

const sampleActual = [
  { isoTime: "2024-01-09T00:00", hour: 0, temperatureC: 7, weatherCode: 61 },
  { isoTime: "2024-01-09T01:00", hour: 1, temperatureC: 6, weatherCode: 63 }
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("renders default location and weather icons from API response", async () => {
    render(<HomePage />);

    const locationLabels = await screen.findAllByText(/東京, 日本/);
    expect(locationLabels.length).toBeGreaterThan(0);
    expect(await screen.findByText(/10\.0℃/)).toBeInTheDocument();
    expect(screen.getAllByText("SUN").length).toBeGreaterThan(0);
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
