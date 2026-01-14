"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type ChartDatum = {
  hour: number;
  forecast?: number | null;
  actual?: number | null;
};

type TemperatureChartProps = {
  data: ChartDatum[];
};

const formatHour = (hour: number) => `${hour}時`;

const formatValue = (value?: number | string) =>
  typeof value === "number" ? `${value.toFixed(0)}℃` : "—";

const CustomTooltip = ({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: number | string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 shadow-xl shadow-black/40 backdrop-blur">
      <div className="font-semibold text-white">{formatHour(Number(label))}</div>
      <ul className="mt-1 space-y-1">
        {payload.map((item) => (
          <li key={item.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color ?? "#ffffff" }}
            />
            <span className="text-slate-200">
              {item.name}: {formatValue(item.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

type Highlight = {
  value: number;
  type: "min" | "max" | "freezing";
};

const calculateHighlights = (data: ChartDatum[]) => {
  const highlights = new Map<number, Highlight>();
  const forecastPoints = data.filter(
    (d) => typeof d.forecast === "number" && d.forecast !== null
  ) as Array<ChartDatum & { forecast: number }>;

  if (forecastPoints.length === 0) return highlights;

  const minValue = Math.min(...forecastPoints.map((d) => d.forecast));
  const maxValue = Math.max(...forecastPoints.map((d) => d.forecast));

  const minPoint = forecastPoints.find((d) => d.forecast === minValue);
  const maxPoint = forecastPoints.find((d) => d.forecast === maxValue);

  if (minPoint) {
    highlights.set(minPoint.hour, { value: minPoint.forecast, type: "min" });
  }
  if (maxPoint) {
    highlights.set(maxPoint.hour, { value: maxPoint.forecast, type: "max" });
  }

  forecastPoints.forEach((p) => {
    if (p.forecast <= 0) {
      highlights.set(p.hour, { value: p.forecast, type: "freezing" });
    }
  });

  return highlights;
};

const renderHighlightDot = (highlights: Map<number, Highlight>) => {
  const Dot = (props: {
    cx?: number;
    cy?: number;
    value?: number;
    payload?: ChartDatum;
  }) => {
    if (props.cx === undefined || props.cy === undefined || !props.payload) return null;
    const highlight = highlights.get(props.payload.hour);
    const value = props.value;

    if (!highlight || value === undefined || value === null) {
      return (
        <circle
          cx={props.cx}
          cy={props.cy}
          r={3}
          fill="#94a3b8"
          stroke="#0b1224"
          strokeWidth={1.5}
        />
      );
    }

    const label = `${value.toFixed(0)}℃`;
    const color = highlight.type === "max" ? "#f97316" : "#38bdf8";
    const width = label.length * 8 + 16;

    return (
      <g>
        <circle
          cx={props.cx}
          cy={props.cy}
          r={6}
          fill={color}
          stroke="#0b1224"
          strokeWidth={2}
          opacity={0.95}
        />
        <g transform={`translate(${props.cx}, ${props.cy - 22})`}>
          <rect
            x={-width / 2}
            y={-12}
            width={width}
            height={22}
            rx={11}
            fill={color}
            opacity={0.95}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            className="text-xs"
            fill="#0b1224"
            fontWeight={600}
          >
            {label}
          </text>
        </g>
      </g>
    );
  };
  Dot.displayName = "HighlightDot";
  return Dot;
};

export function TemperatureChart({ data }: TemperatureChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
        データがまだありません。地点と日付を選ぶと表示します。
      </div>
    );
  }

  const highlights = calculateHighlights(data);
  const highlightDot = renderHighlightDot(highlights);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="2 8" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="hour"
            tickFormatter={formatHour}
            stroke="#cbd5e1"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#e2e8f0", fontSize: 12 }}
          />
          <YAxis
            stroke="#cbd5e1"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}℃`}
            tick={{ fill: "#e2e8f0", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="forecast"
            name="当日予報"
            stroke="#f8fafc"
            strokeWidth={3}
            dot={highlightDot}
            activeDot={{ r: 7, stroke: "#0b1224", strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="昨日実績"
            stroke="#cbd5e1"
            strokeWidth={3}
            dot={{ stroke: "#cbd5e1", strokeWidth: 2, r: 2 }}
            strokeDasharray="8 6"
            activeDot={{ r: 4, stroke: "#0b1224", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
