/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { CRMDatabase } from "../utils/db";
import {
  TrendingUp,
  Award,
  Users,
  Target,
  DollarSign,
  PieChart as PieIcon,
  BarChart2,
  DollarSign as PriceIcon,
  RotateCcw,
  Percent,
} from "lucide-react";

export default function AnalysisDashboard() {
  const leads = CRMDatabase.getLeads();
  const dropdowns = CRMDatabase.getDropdowns();

  // Selected filters for analytics
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("all");
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");

  const sources = useMemo(() => dropdowns.filter((d) => d.category === "lead_source"), [dropdowns]);
  const referrals = useMemo(() => dropdowns.filter((d) => d.category === "referral"), [dropdowns]);

  // Helper selectors
  const getLabel = (id?: string) => dropdowns.find((d) => d.id === id)?.label || "نامشخص";
  const getColor = (id?: string) => dropdowns.find((d) => d.id === id)?.color || "#64748b";

  // Filtered Leads list based on analytics toolbar choices
  const analyzedLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSrc = selectedSourceFilter === "all" || l.lead_source === selectedSourceFilter;
      const matchRef = selectedUserFilter === "all" || l.referral === selectedUserFilter;
      return matchSrc && matchRef;
    });
  }, [leads, selectedSourceFilter, selectedUserFilter]);

  // KPIs
  const totalAnalyzed = analyzedLeads.length;
  const leadsCount = analyzedLeads.filter((l) => l.module_type === "lead").length;
  const oppsCount = analyzedLeads.filter((l) => l.module_type === "opportunity").length;

  const wonOpps = useMemo(() => {
    return analyzedLeads.filter((l) => l.module_type === "opportunity" && l.opportunity_status === "ost_4");
  }, [analyzedLeads]);

  const totalClosedSalesVolume = useMemo(() => {
    return wonOpps.reduce((sum, item) => sum + Number(item.price || 0), 0);
  }, [wonOpps]);

  const totalPotentialVolume = useMemo(() => {
    const opps = analyzedLeads.filter((l) => l.module_type === "opportunity");
    return opps.reduce((sum, item) => sum + Number(item.price || 0), 0);
  }, [analyzedLeads]);

  const avgDealSize = useMemo(() => {
    const pricedOpps = analyzedLeads.filter((l) => l.module_type === "opportunity" && l.price);
    if (pricedOpps.length === 0) return 0;
    const total = pricedOpps.reduce((sum, item) => sum + Number(item.price || 0), 0);
    return Math.round(total / pricedOpps.length);
  }, [analyzedLeads]);

  const conversionRate = useMemo(() => {
    if (totalAnalyzed === 0) return 0;
    return Number(((wonOpps.length / totalAnalyzed) * 100).toFixed(1));
  }, [totalAnalyzed, wonOpps]);

  // Chart 1 Data: Lead Distribution by Source (Pie Chart)
  const sourceChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    analyzedLeads.forEach((l) => {
      const srcName = getLabel(l.lead_source);
      counts[srcName] = (counts[srcName] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => {
      // Find matching color from dropdowns
      const origItem = dropdowns.find((d) => d.category === "lead_source" && d.label === name);
      return {
        name,
        value,
        color: origItem?.color || "#3b82f6",
      };
    });
  }, [analyzedLeads, dropdowns]);

  // Chart 2 Data: Filtered Stats by Status (Bar Chart)
  const statusChartData = useMemo(() => {
    const data: { name: string; leads: number; opportunities: number; fill: string }[] = [];

    // Grouping by statuses
    const statuses = dropdowns.filter(
      (d) => d.category === "lead_status" || d.category === "opportunity_status"
    );

    statuses.forEach((st) => {
      const leadsCountForSt = analyzedLeads.filter(
        (l) => l.module_type === "lead" && l.lead_status === st.id
      ).length;
      const oppCountForSt = analyzedLeads.filter(
        (l) => l.module_type === "opportunity" && l.opportunity_status === st.id
      ).length;

      if (leadsCountForSt > 0 || oppCountForSt > 0) {
        data.push({
          name: st.label,
          leads: leadsCountForSt,
          opportunities: oppCountForSt,
          fill: st.color || "#10b981",
        });
      }
    });

    return data;
  }, [analyzedLeads, dropdowns]);

  // Chart 3 Data: Revenue Performance of Experts (Bar Chart potential vs won)
  const revenueChartData = useMemo(() => {
    return referrals.map((ref) => {
      const userLeads = leads.filter((l) => l.referral === ref.id);
      const potential = userLeads
        .filter((l) => l.module_type === "opportunity")
        .reduce((sum, item) => sum + Number(item.price || 0), 0);
      const won = userLeads
        .filter((l) => l.module_type === "opportunity" && l.opportunity_status === "ost_4")
        .reduce((sum, item) => sum + Number(item.price || 0), 0);

      return {
        name: ref.label,
        "ارزش بالقوه": potential / 1000000, // Millions Toman
        "فروش قطعی": won / 1000000, // Millions Toman
      };
    });
  }, [leads, referrals]);

  // Scorecard calculations for each consultant
  const scorecardData = useMemo(() => {
    return referrals.map((ref) => {
      const userLeads = leads.filter((l) => l.referral === ref.id);
      const total = userLeads.length;
      const leadsCount = userLeads.filter((l) => l.module_type === "lead").length;
      const oppsCount = userLeads.filter((l) => l.module_type === "opportunity").length;
      const won = userLeads.filter((l) => l.module_type === "opportunity" && l.opportunity_status === "ost_4").length;
      const revenue = userLeads
        .filter((l) => l.module_type === "opportunity" && l.opportunity_status === "ost_4")
        .reduce((sum, item) => sum + Number(item.price || 0), 0);

      const winRate = total > 0 ? ((won / total) * 100).toFixed(1) : "0";

      return {
        id: ref.id,
        name: ref.label,
        color: ref.color || "#06b6d4",
        totalLeads: leadsCount,
        totalOpps: oppsCount,
        wonOppsCount: won,
        totalSales: revenue,
        successPercent: winRate,
      };
    }).sort((a, b) => b.totalSales - a.totalSales);
  }, [leads, referrals]);

  const handleResetFilters = () => {
    setSelectedSourceFilter("all");
    setSelectedUserFilter("all");
  };

  return (
    <div className="space-y-6 text-right select-none animate-fadeIn" dir="rtl" id="analysis-dashboard-root">
      
      {/* Analytics header filter bar */}
      <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-l from-cyan-400 to-indigo-400 flex items-center gap-1.5">
            <PieIcon className="w-5 h-5 text-cyan-400" />
            <span>مرکز تحلیل‌های پیشرفته و آنالیز هوشمند فرآیندها</span>
          </h2>
          <p className="text-[10px] text-slate-400 mt-1">تولید خودکار نمودارهای آماری، درصد موفقیت همکاران و رهگیری ورودی معاملات</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Source Filter */}
          <div className="flex flex-col items-start gap-1">
            <span className="text-[9px] text-slate-400 font-bold mr-1">منبع جذب</span>
            <select
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className="bg-slate-950 border border-white/5 text-[10px] text-slate-200 py-1.5 px-3 rounded-lg cursor-pointer focus:border-cyan-500/40"
            >
              <option value="all">همه منابع جذب</option>
              {sources.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.label}
                </option>
              ))}
            </select>
          </div>

          {/* User/Referral Filter */}
          <div className="flex flex-col items-start gap-1">
            <span className="text-[9px] text-slate-400 font-bold mr-1">ارجاع به کارشناس</span>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="bg-slate-950 border border-white/5 text-[10px] text-slate-200 py-1.5 px-3 rounded-lg cursor-pointer focus:border-indigo-500/40"
            >
              <option value="all">همه کارشناسان</option>
              {referrals.map((ref) => (
                <option key={ref.id} value={ref.id}>
                  {ref.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleResetFilters}
            className="p-1.5 mt-4 bg-slate-900 border border-white/5 hover:border-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer text-[10px] flex items-center gap-1"
            title="بازنشانی فیلترها"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>پاک کردن</span>
          </button>
        </div>
      </div>

      {/* Numerical KPI Section of Filtered Leads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-cyan-500/10 transition-all">
          <div className="absolute top-0 left-0 w-16 h-16 bg-cyan-500/5 rounded-br-full blur pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold">لیدهای تحت آنالیز</span>
            <p className="text-2xl font-black text-cyan-400 font-mono tracking-wider">{totalAnalyzed}</p>
            <p className="text-[9px] text-slate-500">
              {leadsCount} لید / {oppsCount} فرصت
            </p>
          </div>
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
            <Users className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-emerald-500/10 transition-all">
          <div className="absolute top-0 left-0 w-16 h-16 bg-emerald-500/5 rounded-br-full blur pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold">فروش قطعی (فیلتر شده)</span>
            <p className="text-lg font-black text-emerald-400 font-mono tracking-tight">
              {totalClosedSalesVolume.toLocaleString("fa-IR")}
            </p>
            <p className="text-[9px] text-slate-500">مجموع تراکنش ناشی از عقد سود</p>
          </div>
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <Target className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-indigo-500/10 transition-all">
          <div className="absolute top-0 left-0 w-16 h-16 bg-indigo-500/5 rounded-br-full blur pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold">ارزش کل لاین معامله</span>
            <p className="text-lg font-black text-indigo-400 font-mono tracking-tight">
              {totalPotentialVolume.toLocaleString("fa-IR")}
            </p>
            <p className="text-[9px] text-slate-500">پتنسیال کل فرصت‌های فروش</p>
          </div>
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-rose-500/10 transition-all">
          <div className="absolute top-0 left-0 w-16 h-16 bg-rose-500/5 rounded-br-full blur pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold">میانگین ارزش قرارداد</span>
            <p className="text-lg font-black text-rose-400 font-mono tracking-tight">
              {avgDealSize.toLocaleString("fa-IR")}
            </p>
            <p className="text-[9px] text-slate-500">شاخص میانگین مالی هر کارفرما</p>
          </div>
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-amber-500/10 transition-all">
          <div className="absolute top-0 left-0 w-16 h-16 bg-amber-500/5 rounded-br-full blur pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold">نرخ تبدیل نهایی (CR)</span>
            <p className="text-2xl font-black text-amber-400 font-mono tracking-widest">{conversionRate}%</p>
            <p className="text-[9px] text-slate-500">نسبت عقد نهایی قرارداد به ورودی‌ها</p>
          </div>
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
            <Percent className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Main Charts Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart A: Pie Chart for Lead Sources */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-xs font-black text-slate-200">سهم کانال‌های بازاریابی و منبع جذب ورودی‌ها</h3>
            <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-lg font-bold">Marketing Slices</span>
          </div>

          <div className="h-64 flex items-center justify-center">
            {sourceChartData.length === 0 ? (
              <p className="text-xs text-slate-500 font-bold">داده‌ای فیلتر شده مأخذ جهت رسم نمودار وجود ندارد.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {sourceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0b1329",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      textAlign: "right",
                      fontFamily: "inherit",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart B: Funnel Stages Status Details */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-xs font-black text-slate-200">فراوانی رکوردها در مراحل مختلف قیف فروش</h3>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-bold">Process Volume</span>
          </div>

          <div className="h-64">
            {statusChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-xs text-slate-500 font-bold">داده‌ای جهت رسم فراوانی مراحل وجود ندارد.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} width={25} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0b1329",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      textAlign: "right",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px", marginTop: "5px" }} />
                  <Bar dataKey="leads" name="تعداد در مرحله سرنخ" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="opportunities" name="تعداد در مرحله فرصت" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart C: Team Revenue Potential vs Finalized */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-xs font-black text-slate-200">تحلیل ارزشی قراردادها به تفکیک کارشناس ارجاع به</h3>
            <span className="text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-lg font-bold">Revenue by Consultant (Millions Toman)</span>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={9} label={{ value: "میلیون تومان", angle: -90, position: "insideLeft", textAnchor: "middle", style: { fill: "#94a3b8", fontSize: 9 } }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1329",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    textAlign: "right",
                  }}
                  formatter={(value) => [`${(Number(value)).toLocaleString()} میلیون تومان`]}
                />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="ارزش بالقوه" fill="rgba(99, 102, 241, 0.4)" stroke="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="فروش قطعی" fill="rgba(16, 185, 129, 0.85)" stroke="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Expert Performance Scorecard Table */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black text-slate-200">جدول رتبه‌بندی عملکردی همکاران و مشاوران فروش (Scorecard)</h3>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold font-mono">Realtime Ranking Table</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 font-bold text-[10px]">
                <th className="pb-3 pr-2">رتبه</th>
                <th className="pb-3">نام همکار</th>
                <th className="pb-3 text-center">تعداد سرنخ‌ها</th>
                <th className="pb-3 text-center">تعداد فرصت‌ها</th>
                <th className="pb-3 text-center">قراردادهای قطعی</th>
                <th className="pb-3 text-center">نرخ موفقیت همکار (Conversion)</th>
                <th className="pb-3 text-left pl-2">مجموع عملکرد فروش منتهی به عقد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {scorecardData.map((row, index) => (
                <tr key={row.id} className="hover:bg-white/[0.01] transition-all group">
                  <td className="py-3.5 pr-2">
                    <span className={`w-5 h-5 flex items-center justify-center font-bold text-[10px] rounded-full ${
                      index === 0 
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                        : index === 1 
                        ? "bg-slate-400/20 text-slate-300 border border-white/10" 
                        : "bg-slate-900 text-slate-500"
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3.5 flex items-center gap-2 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                    <span className="text-slate-200 group-hover:text-white">{row.name}</span>
                  </td>
                  <td className="py-3.5 text-center font-mono text-slate-400">{row.totalLeads} لید</td>
                  <td className="py-3.5 text-center font-mono text-slate-400">{row.totalOpps} فرصت</td>
                  <td className="py-3.5 text-center text-teal-400 font-bold font-mono">{row.wonOppsCount} معامله</td>
                  <td className="py-3.5 text-center font-mono">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-[11px] font-black text-slate-200">{row.successPercent}%</span>
                      <div className="w-12 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded" style={{ width: `${Math.min(Number(row.successPercent), 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-left text-emerald-400 font-black font-mono pl-2">
                    {row.totalSales > 0 ? `${(row.totalSales).toLocaleString("fa-IR")} تومان` : "۰ ریال"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
