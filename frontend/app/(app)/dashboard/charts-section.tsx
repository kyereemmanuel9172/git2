'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui';
import { Skeleton } from '@/components/Skeleton';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

interface TrendPoint {
  date: string;
  value: number;
}

interface ServiceData {
  name: string;
  value: number;
}

interface StatusData {
  name: string;
  value: number;
}

interface ChartsSectionProps {
  trend: TrendPoint[];
  byService: ServiceData[];
  demographics: { byStatus: StatusData[] };
  loadingTrend: boolean;
  loadingByService: boolean;
  loadingDemographics: boolean;
}

export default function ChartsSection({
  trend,
  byService,
  demographics,
  loadingTrend,
  loadingByService,
  loadingDemographics,
}: ChartsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 transition-shadow hover:shadow-md lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800">Attendance trend</h3>
          <p className="text-xs text-slate-500">Last 30 days</p>
          <div className="mt-4 h-64">
            {loadingTrend ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" name="Check-ins" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5 transition-shadow hover:shadow-md">
          <h3 className="text-sm font-semibold text-slate-800">By service type</h3>
          <p className="text-xs text-slate-500">Last 30 days</p>
          <div className="mt-4 h-52">
            {loadingByService ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byService} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={3}>
                    {byService.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {byService.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1 text-xs text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 transition-shadow hover:shadow-md">
        <h3 className="text-sm font-semibold text-slate-800">Membership status</h3>
        <p className="text-xs text-slate-500">By member status</p>
        <div className="mt-4 h-48">
          {loadingDemographics ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demographics.byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Members" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
