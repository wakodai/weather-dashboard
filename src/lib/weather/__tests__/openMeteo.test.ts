import { fetchDashboard, searchLocations } from "../openMeteo";
import { Location } from "../types";

describe("openMeteo client", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch as unknown as typeof fetch);
  });

  afterEach(() => {
    mockFetch.mockReset();
    vi.unstubAllGlobals();
  });

  test("fetchDashboard merges forecast and archive hourly points", async () => {
    const location: Location = {
      id: "tokyo",
      name: "Tokyo",
      latitude: 35.6,
      longitude: 139.7,
      timezone: "Asia/Tokyo"
    };

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            hourly: {
              time: ["2024-01-10T00:00", "2024-01-10T01:00"],
              temperature_2m: [10, 11],
              weathercode: [0, 1]
            }
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            hourly: {
              time: ["2024-01-09T00:00", "2024-01-09T01:00"],
              temperature_2m: [6, 7],
              weathercode: [61, 63]
            }
          })
        )
      );

    const result = await fetchDashboard({ location, date: "2024-01-10" });

    expect(result.todayForecast).toHaveLength(2);
    expect(result.todayForecast[0].temperatureC).toBe(10);
    expect(result.yesterdayActual[0].hour).toBe(0);
    expect(result.yesterdayActual[1].temperatureC).toBe(7);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("searchLocations maps geocoding results", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 1,
              name: "Tokyo",
              admin1: "Tokyo",
              country: "Japan",
              latitude: 35.6,
              longitude: 139.7,
              timezone: "Asia/Tokyo"
            }
          ]
        })
      )
    );

    const results = await searchLocations("tokyo", 3, "ja");

    expect(results[0].name).toContain("Tokyo");
    expect(results[0].timezone).toBe("Asia/Tokyo");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
