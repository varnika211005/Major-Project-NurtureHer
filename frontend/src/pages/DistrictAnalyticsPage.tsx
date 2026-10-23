import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, AlertTriangle, Baby, MapPin, ShieldAlert, Stethoscope } from "lucide-react";
import { formatNumber } from "@/lib/locale";
import { Page } from "@/components/common/Page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * District-level analytics for Karnataka using deterministic synthetic data only.
 * This route is restricted to doctor/admin roles and clearly labeled as synthetic.
 * No backend calls or real PHI are involved.
 */

const DISTRICTS = [
  "Bengaluru Urban",
  "Mysuru",
  "Belagavi",
  "Hubballi-Dharwad",
  "Dakshina Kannada",
  "Kalaburagi",
];

const pcosData = [
  { district: "Bengaluru Urban", screened: 842, positive: 186, highRisk: 72 },
  { district: "Mysuru", screened: 624, positive: 142, highRisk: 58 },
  { district: "Belagavi", screened: 586, positive: 138, highRisk: 61 },
  { district: "Hubballi-Dharwad", screened: 512, positive: 124, highRisk: 54 },
  { district: "Dakshina Kannada", screened: 468, positive: 98, highRisk: 38 },
  { district: "Kalaburagi", screened: 436, positive: 116, highRisk: 52 },
];

const ppdData = [
  { district: "Bengaluru Urban", screened: 764, positive: 128, highRisk: 46 },
  { district: "Mysuru", screened: 582, positive: 106, highRisk: 38 },
  { district: "Belagavi", screened: 548, positive: 112, highRisk: 44 },
  { district: "Hubballi-Dharwad", screened: 486, positive: 92, highRisk: 36 },
  { district: "Dakshina Kannada", screened: 442, positive: 76, highRisk: 28 },
  { district: "Kalaburagi", screened: 418, positive: 94, highRisk: 42 },
];

const careCoverage = [
  { name: "ANC Coverage", value: 78, color: "#EC4899" },
  { name: "PNC Coverage", value: 72, color: "#C084FC" },
  { name: "Nutrition Support", value: 64, color: "#22C55E" },
  { name: "Mental Health Referral", value: 58, color: "#F59E0B" },
];

const riskByDistrict = DISTRICTS.map((d) => {
  const p = pcosData.find((x) => x.district === d)!;
  const ppd = ppdData.find((x) => x.district === d)!;
  return {
    district: d.replace(" Urban", "").replace("-Dharwad", ""),
    highRisk: p.highRisk + ppd.highRisk,
    pcosHigh: p.highRisk,
    ppdHigh: ppd.highRisk,
  };
});

export function DistrictAnalyticsPage() {
  const totalScreenedPCOS = pcosData.reduce((s, d) => s + d.screened, 0);
  const totalPositivePCOS = pcosData.reduce((s, d) => s + d.positive, 0);
  const totalHighPCOS = pcosData.reduce((s, d) => s + d.highRisk, 0);
  const totalScreenedPPD = ppdData.reduce((s, d) => s + d.screened, 0);
  const totalPositivePPD = ppdData.reduce((s, d) => s + d.positive, 0);
  const totalHighPPD = ppdData.reduce((s, d) => s + d.highRisk, 0);

  return (
    <Page
      title="District Analytics (Synthetic)"
      subtitle="Karnataka district-level screening trends — for demonstration only, no real patient data"
    >
      <div className="mb-6 rounded-[24px] border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/70 p-5 shadow-soft dark:border-amber-500/30 dark:from-amber-950/30 dark:to-orange-950/20">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-ink dark:text-white">SYNTHETIC DATA ONLY</p>
            <p className="mt-1 text-xs leading-5 text-muted dark:text-white/60">
              All figures are deterministically generated for six Karnataka districts. This dashboard is intended for
              product demonstration and does not contain, aggregate or expose real PHI.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lavender-100 text-primary dark:bg-white/10">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">PCOS Screened</p>
            <p className="text-xl font-black text-ink dark:text-white">{formatNumber(totalScreenedPCOS)}</p>
            <p className="text-[11px] text-muted">{totalPositivePCOS} positive · {totalHighPCOS} high-risk</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
            <Baby className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">PPD Screened</p>
            <p className="text-xl font-black text-ink dark:text-white">{formatNumber(totalScreenedPPD)}</p>
            <p className="text-[11px] text-muted">{totalPositivePPD} positive · {totalHighPPD} high-risk</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Combined High-Risk</p>
            <p className="text-xl font-black text-ink dark:text-white">{formatNumber(totalHighPCOS + totalHighPPD)}</p>
            <p className="text-[11px] text-muted">Across {DISTRICTS.length} districts</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Coverage</p>
            <p className="text-xl font-black text-ink dark:text-white">Karnataka (6)</p>
            <p className="text-[11px] text-muted">Synthetic pilot region</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-ink dark:text-white">High-Risk by District</p>
              <p className="text-xs text-muted">PCOS + PPD combined (synthetic)</p>
            </div>
            <Badge>Demo</Badge>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={riskByDistrict}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 130, 158, 0.2)" />
              <XAxis dataKey="district" tick={{ fill: "#7B6874", fontSize: 11 }} />
              <YAxis tick={{ fill: "#7B6874", fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="pcosHigh" stackId="a" fill="#C084FC" name="PCOS high-risk" radius={[0, 0, 0, 0]} />
              <Bar dataKey="ppdHigh" stackId="a" fill="#EC4899" name="PPD high-risk" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-ink dark:text-white">Care Coverage Indicators</p>
              <p className="text-xs text-muted">System readiness (synthetic)</p>
            </div>
            <Activity className="h-4 w-4 text-muted" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={careCoverage} innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                {careCoverage.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-ink dark:text-white">District Breakdown Table</p>
            <p className="text-xs text-muted">Screening counts and risk rates (synthetic)</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-lavender-200/70 text-xs uppercase tracking-wider text-muted dark:border-white/10">
                <th className="pb-2 pr-4">District</th>
                <th className="pb-2 pr-4">PCOS Screened</th>
                <th className="pb-2 pr-4">PCOS Positive</th>
                <th className="pb-2 pr-4">PCOS High-Risk</th>
                <th className="pb-2 pr-4">PPD Screened</th>
                <th className="pb-2 pr-4">PPD Positive</th>
                <th className="pb-2">PPD High-Risk</th>
              </tr>
            </thead>
            <tbody>
              {pcosData.map((p, i) => {
                const ppd = ppdData[i];
                return (
                  <tr key={p.district} className="border-b border-lavender-100/70 dark:border-white/5">
                    <td className="py-2.5 pr-4 font-bold text-ink dark:text-white">{p.district}</td>
                    <td className="py-2.5 pr-4 text-muted">{p.screened}</td>
                    <td className="py-2.5 pr-4 text-muted">{p.positive}</td>
                    <td className="py-2.5 pr-4 font-semibold text-amber-700 dark:text-amber-300">{p.highRisk}</td>
                    <td className="py-2.5 pr-4 text-muted">{ppd.screened}</td>
                    <td className="py-2.5 pr-4 text-muted">{ppd.positive}</td>
                    <td className="py-2.5 font-semibold text-rose-600 dark:text-rose-300">{ppd.highRisk}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}
