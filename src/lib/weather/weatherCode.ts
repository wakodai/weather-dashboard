type WeatherDescriptor = {
  label: string;
  symbol: string;
};

const WEATHER_CODE_MAP: Record<number, WeatherDescriptor> = {
  0: { label: "快晴", symbol: "SUN" },
  1: { label: "晴れ", symbol: "SUN" },
  2: { label: "薄曇り", symbol: "CLD" },
  3: { label: "曇り", symbol: "CLD" },
  45: { label: "霧", symbol: "FOG" },
  48: { label: "霧", symbol: "FOG" },
  51: { label: "霧雨", symbol: "DRZ" },
  53: { label: "霧雨", symbol: "DRZ" },
  55: { label: "霧雨", symbol: "DRZ" },
  61: { label: "弱い雨", symbol: "RN" },
  63: { label: "雨", symbol: "RN" },
  65: { label: "強い雨", symbol: "RN" },
  71: { label: "弱い雪", symbol: "SN" },
  73: { label: "雪", symbol: "SN" },
  75: { label: "強い雪", symbol: "SN" },
  80: { label: "にわか雨", symbol: "SH" },
  81: { label: "にわか雨", symbol: "SH" },
  82: { label: "強いにわか雨", symbol: "SH" },
  95: { label: "雷雨", symbol: "TH" },
  96: { label: "雷雨（ひょう）", symbol: "TH" },
  99: { label: "雷雨（ひょう）", symbol: "TH" }
};

export const describeWeatherCode = (code: number): WeatherDescriptor => {
  return (
    WEATHER_CODE_MAP[code] ?? {
      label: "不明",
      symbol: "NA"
    }
  );
};
