import { Area, AreaChart, Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { activityData, healthAnalytics, heartRateData, moodTrend, nutritionData, sleepData, waterData } from "@/data/mock";

const tooltipProps = {
  contentStyle: {
    border: "1px solid rgba(236, 72, 153, 0.14)",
    borderRadius: 18,
    boxShadow: "0 18px 50px rgba(126, 52, 98, 0.12)",
  },
  labelStyle: { color: "#251827", fontWeight: 800 },
  itemStyle: { fontWeight: 700 },
};

export function MoodTrendChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={moodTrend}>
        <defs>
          <linearGradient id="calm" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#EC4899" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#7B6874", fontSize: 12, fontWeight: 700 }} />
        <YAxis hide />
        <Tooltip {...tooltipProps} />
        <Area type="monotone" dataKey="calm" stroke="#EC4899" fill="url(#calm)" strokeWidth={3} />
        <Area type="monotone" dataKey="energy" stroke="#C084FC" fill="transparent" strokeWidth={3} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DoughnutChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={healthAnalytics} innerRadius={62} outerRadius={92} paddingAngle={5} dataKey="value">
          {healthAnalytics.map((item) => (
            <Cell key={item.name} fill={item.color} />
          ))}
        </Pie>
        <Tooltip {...tooltipProps} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function WaterChart() {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={waterData}>
        <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#7B6874", fontSize: 12, fontWeight: 700 }} />
        <YAxis hide />
        <Tooltip {...tooltipProps} />
        <Bar dataKey="cups" radius={[12, 12, 0, 0]} fill="#93C5FD" barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function HeartRateChart() {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart data={heartRateData}>
        <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fill: "#7B6874", fontSize: 12, fontWeight: 700 }} />
        <YAxis hide />
        <Tooltip {...tooltipProps} />
        <Line type="monotone" dataKey="bpm" stroke="#EC4899" strokeWidth={3} dot={{ r: 4, fill: "#EC4899" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SleepChart() {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={sleepData}>
        <defs>
          <linearGradient id="sleep" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#C084FC" stopOpacity={0.34} />
            <stop offset="95%" stopColor="#C084FC" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#7B6874", fontSize: 12, fontWeight: 700 }} />
        <YAxis hide />
        <Tooltip {...tooltipProps} />
        <Area type="monotone" dataKey="sleep" stroke="#C084FC" fill="url(#sleep)" strokeWidth={3} />
        <Line type="monotone" dataKey="deep" stroke="#EC4899" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ActivityChart() {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={activityData}>
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#7B6874", fontSize: 12, fontWeight: 700 }} />
        <YAxis hide />
        <Tooltip {...tooltipProps} />
        <Bar dataKey="steps" radius={[14, 14, 0, 0]} fill="#22C55E" barSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function NutritionChart() {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadialBarChart innerRadius="24%" outerRadius="96%" data={nutritionData} startAngle={90} endAngle={-270}>
        <RadialBar dataKey="value" cornerRadius={14} background>
          {nutritionData.map((item) => (
            <Cell key={item.name} fill={item.color} />
          ))}
        </RadialBar>
        <Tooltip {...tooltipProps} />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

