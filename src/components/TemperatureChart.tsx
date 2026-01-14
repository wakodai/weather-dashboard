"use client";

import {
  Legend,
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
    <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-lg">
      <div className="font-semibold">{formatHour(Number(label))}</div>
      <ul className="mt-1 space-y-0.5">
        {payload.map((item) => (
          <li key={item.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color ?? "#22d3ee" }}
            />
            <span>
              {item.name}: {item.value ?? "—"}℃ 
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export function TemperatureChart({ data }: TemperatureChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
        データがまだありません。地点と日付を選ぶと表示します。
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
          <XAxis
            dataKey="hour"
            tickFormatter={formatHour}
            stroke="#94a3b8"
            tickLine={false}
          />
          <YAxis
            stroke="#94a3b8"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}℃`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="forecast"
            name="当日予報"
            stroke="#22d3ee"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="昨日実績"
            stroke="#c084fc"
            strokeWidth={3}
            dot={false}
            strokeDasharray="6 6"
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
