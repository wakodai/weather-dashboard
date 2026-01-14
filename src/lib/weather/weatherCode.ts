type WeatherDescriptor = {
  label: string;
  symbol: string;
  emoji: string;
  rainChance: number;
};

const WEATHER_CODE_MAP: Record<number, WeatherDescriptor> = {
  0: { label: "快晴", symbol: "SUN", emoji: "☀️", rainChance: 0 },
  1: { label: "晴れ", symbol: "SUN", emoji: "☀️", rainChance: 0 },
  2: { label: "薄曇り", symbol: "CLD", emoji: "🌤️", rainChance: 10 },
  3: { label: "曇り", symbol: "CLD", emoji: "☁️", rainChance: 10 },
  45: { label: "霧", symbol: "FOG", emoji: "🌫️", rainChance: 10 },
  48: { label: "霧", symbol: "FOG", emoji: "🌫️", rainChance: 10 },
  51: { label: "霧雨", symbol: "DRZ", emoji: "🌦️", rainChance: 20 },
  53: { label: "霧雨", symbol: "DRZ", emoji: "🌦️", rainChance: 30 },
  55: { label: "霧雨", symbol: "DRZ", emoji: "🌦️", rainChance: 35 },
  61: { label: "弱い雨", symbol: "RN", emoji: "🌧️", rainChance: 40 },
  63: { label: "雨", symbol: "RN", emoji: "🌧️", rainChance: 50 },
  65: { label: "強い雨", symbol: "RN", emoji: "🌧️", rainChance: 60 },
  71: { label: "弱い雪", symbol: "SN", emoji: "🌨️", rainChance: 30 },
  73: { label: "雪", symbol: "SN", emoji: "🌨️", rainChance: 40 },
  75: { label: "強い雪", symbol: "SN", emoji: "🌨️", rainChance: 60 },
  80: { label: "にわか雨", symbol: "SH", emoji: "🌦️", rainChance: 40 },
  81: { label: "にわか雨", symbol: "SH", emoji: "🌦️", rainChance: 50 },
  82: { label: "強いにわか雨", symbol: "SH", emoji: "🌦️", rainChance: 60 },
  95: { label: "雷雨", symbol: "TH", emoji: "⛈️", rainChance: 70 },
  96: { label: "雷雨（ひょう）", symbol: "TH", emoji: "⛈️", rainChance: 70 },
  99: { label: "雷雨（ひょう）", symbol: "TH", emoji: "⛈️", rainChance: 70 }
};

export const describeWeatherCode = (code: number): WeatherDescriptor => {
  return (
    WEATHER_CODE_MAP[code] ?? {
      label: "不明",
      symbol: "NA",
      emoji: "❓",
      rainChance: 0
    }
  );
};

export const rainChanceFromWeatherCode = (code: number): number => {
  const descriptor = describeWeatherCode(code);
  return descriptor.rainChance;
};
