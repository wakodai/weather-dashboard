import { formatDateInTimezone, shiftDate } from "../dateUtils";

describe("dateUtils", () => {
  test("shiftDate moves date by given days", () => {
    expect(shiftDate("2024-01-10", -1)).toBe("2024-01-09");
    expect(shiftDate("2024-01-10", 2)).toBe("2024-01-12");
  });

  test("formatDateInTimezone respects timezone day rollover", () => {
    const base = new Date("2024-01-10T23:00:00Z"); // 08:00+11 in Pacific/Auckland -> next day
    const tz = "Pacific/Auckland";
    expect(formatDateInTimezone(tz, base)).toBe("2024-01-11");

    const tokyo = "Asia/Tokyo";
    expect(formatDateInTimezone(tokyo, new Date("2024-01-10T12:00:00Z"))).toBe(
      "2024-01-10"
    );
  });
});
