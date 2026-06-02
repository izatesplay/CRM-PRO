/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Lead, DropdownOption } from "../types";
import { CRMDatabase } from "../utils/db";
import { 
  DollarSign, 
  Wallet, 
  HelpCircle, 
  Search, 
  Calendar, 
  RefreshCw, 
  ArrowLeftRight, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Scale
} from "lucide-react";

interface InstallmentSalesProps {
  leads: Lead[];
  dropdowns: DropdownOption[];
  onRefreshData: () => void;
}

export default function InstallmentSales({ leads, dropdowns, onRefreshData }: InstallmentSalesProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConsultant, setSelectedConsultant] = useState("all");

  const consultants = dropdowns.filter(d => d.category === "consultant" || d.category === "referral");

  // Get active leads/opportunities that have payment_type set to Installments
  // Installment payment types: pty_2 (اقساطی ماهیانه) and pty_3 (۵۰٪ پیش‌پرداخت + تسویه نهایی)
  const installmentRecords = useMemo(() => {
    return leads.filter((item) => {
      if (!item.payment_type) return false;
      
      const pType = item.payment_type;
      const matchesType = pType === "pty_2" || pType === "pty_3";
      if (!matchesType) return false;

      // Filter by consultant/referral
      if (selectedConsultant !== "all" && item.referral !== selectedConsultant) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery = 
          item.full_name.toLowerCase().includes(query) || 
          item.mobile.includes(query) ||
          (item.request_challenge && item.request_challenge.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [leads, selectedConsultant, searchQuery]);

  // Aggregate statistics
  const aggregator = useMemo(() => {
    let totalInstallmentValue = 0;
    let totalCashCollected = 0; // 50% for pty_3, customizable or 100% for cash, let's treat pty_3 as 50% cash component
    let totalDeferredAmount = 0; // remaining debt component
    let pty3Count = 0;
    let pty2Count = 0;

    installmentRecords.forEach((item) => {
      const price = Number(item.price || 0);
      totalInstallmentValue += price;

      if (item.payment_type === "pty_3") {
        // 50% cash collected, 50% installment
        const cashValue = price * 0.50;
        totalCashCollected += cashValue;
        totalDeferredAmount += price * 0.50;
        pty3Count++;
      } else if (item.payment_type === "pty_2") {
        // Treatment of monthly installment: let's assume 20% down payment as cash component or treat it fully as installments
        // We can treat it as 30% cash downpayment + 70% installments
        const cashValue = price * 0.30;
        totalCashCollected += cashValue;
        totalDeferredAmount += price * 0.70;
        pty2Count++;
      }
    });

    return {
      totalInstallmentValue,
      totalCashCollected,
      totalDeferredAmount,
      pty3Count,
      pty2Count
    };
  }, [installmentRecords]);

  // Read clean Persian labels
  const getLabel = (id?: string) => {
    return dropdowns.find((d) => d.id === id)?.label || "نامشخص";
  };

  const getBadgeColor = (id?: string) => {
    return dropdowns.find((d) => d.id === id)?.color || "#6b7280";
  };

  return (
    <div className="space-y-6 text-right" id="installment-sales-hub" dir="rtl">
      
      {/* Header Info Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Scale className="w-6 h-6 text-indigo-400" />
            <span>پنل تخصصی مدیریت و ردیابی فروش اقساطی کلاینت‌ها</span>
          </h1>
          <p className="text-xs text-slate-400">
            محاسبه خودکار جزء نقدی معاملات چندمرحله‌ای (سهم ۵۰ درصدی معاهدات پایا) و برنامه‌ریزی وصول مطالبات معوق با اقساط ماهیانه.
          </p>
        </div>
        
        <button
          onClick={onRefreshData}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer self-start"
        >
          <RefreshCw className="w-4 h-4 animate-spin-slow" />
          <span>بروزرسانی جریان مالی</span>
        </button>
      </div>

      {/* Numerical Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="glass-panel p-4.5 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-12 h-12 bg-indigo-500/5 rounded-br-full blur" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold">ارزش کل معاملات اقساطی</span>
            <p className="text-lg font-black text-indigo-400 font-mono tracking-tight">
              {aggregator.totalInstallmentValue.toLocaleString("fa-IR")}
            </p>
            <p className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
              <span>تعداد کل اقساط:</span>
              <strong className="text-slate-300 font-mono">{installmentRecords.length} پرونده</strong>
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel p-4.5 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-12 h-12 bg-emerald-500/5 rounded-br-full blur" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold">بخش نقدی وصول شده (۵۰٪ دو مرحله‌ای)</span>
            <p className="text-lg font-black text-emerald-400 font-mono tracking-tight">
              {aggregator.totalCashCollected.toLocaleString("fa-IR")}
            </p>
            <p className="text-[9px] text-slate-500 font-bold">۵۰٪ کل مبلغ معاملات دو مرحله‌ای مابقی به عنوان نقد پیش‌دریافت</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel p-4.5 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-12 h-12 bg-amber-500/5 rounded-br-full blur" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold">مجموع اقساط معلق (Deferred Component)</span>
            <p className="text-lg font-black text-amber-400 font-mono tracking-tight">
              {aggregator.totalDeferredAmount.toLocaleString("fa-IR")}
            </p>
            <p className="text-[9px] text-slate-500 font-bold">باقیمانده بدهکاری کلاینت‌ها جهت تسویه ماه‌های آتی</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel p-4.5 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-12 h-12 bg-cyan-500/5 rounded-br-full blur" />
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold">تفکیک ساختار معاهدات پرداخت</span>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 font-semibold pt-1">
              <div className="p-1 rounded bg-slate-900 border border-white/5">
                <span>دو مرحله‌ای (۵۰٪):</span>
                <p className="text-cyan-400 font-mono text-sm font-bold">{aggregator.pty3Count}</p>
              </div>
              <div className="p-1 rounded bg-slate-900 border border-white/5">
                <span>اقساط ماهیانه:</span>
                <p className="text-purple-400 font-mono text-sm font-bold">{aggregator.pty2Count}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar toolbar */}
      <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="جستجو در نام خریدار قسطی، چالش‌ها یا شماره تماس..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input text-xs p-2.5 rounded-xl text-right pr-9"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
        </div>

        <div className="w-full md:w-auto flex items-center gap-2">
          <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">فیلتر کارشناس مسئول:</span>
          <select
            value={selectedConsultant}
            onChange={(e) => setSelectedConsultant(e.target.value)}
            className="w-full md:w-48 glass-input text-xs p-2 rounded-xl bg-slate-950 text-right cursor-pointer"
          >
            <option value="all">همه کارشناسان ارجاعی</option>
            {consultants.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Central Interactive Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-slate-950/20 shadow-xl">
        <table className="w-full text-right border-collapse text-xs">
          <thead className="bg-slate-950 text-slate-300">
            <tr className="border-b border-white/5 font-extrabold text-[11px]">
              <th className="p-3.5 px-4">مشخصات خریدار قسطی</th>
              <th className="p-3.5">تلفن تماس</th>
              <th className="p-3.5">سرویس معامله</th>
              <th className="p-3.5">کارشناس ارجاعی</th>
              <th className="p-3.5">نوع تفاهم مالی پرداخت</th>
              <th className="p-3.5 text-left">ارزش نهایی قرارداد</th>
              <th className="p-3.5 text-left text-emerald-400">سهم نقد معاملاتی (۵۰٪)</th>
              <th className="p-3.5 text-left text-amber-400">باقیمانده قسطی تعهد</th>
              <th className="p-3.5 text-center">وضعیت پرونده مالی</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {installmentRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                  هیچ پرونده فروشی با نوع پرداخت اقساطی یا دو مرحله‌ای منطبق بر جستجوی شما یافت نشد.
                </td>
              </tr>
            ) : (
              installmentRecords?.map((item) => {
                const totalVal = Number(item.price || 0);
                
                // 50% for pty_3, and we set e.g. 30% downpayment for pty_2
                const isPty3 = item.payment_type === "pty_3";
                const cashPortion = isPty3 ? totalVal * 0.50 : totalVal * 0.30;
                const installmentPortion = isPty3 ? totalVal * 0.50 : totalVal * 0.70;

                const statusLabel = item.opportunity_status ? getLabel(item.opportunity_status) : getLabel(item.lead_status);
                const statusColor = item.opportunity_status ? getBadgeColor(item.opportunity_status) : getBadgeColor(item.lead_status);

                return (
                  <tr key={item.id} className="hover:bg-white/[0.01] transition-all group">
                    <td className="p-4">
                      <div className="font-bold text-slate-200 group-hover:text-white transition">
                        {item.full_name}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-600" />
                        <span>ثبت شده در: {item.created_at ? new Date(item.created_at).toLocaleDateString("fa-IR") : "-"}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-400 text-[11px]">{item.mobile}</td>
                    <td className="p-4 text-slate-300 font-semibold">{getLabel(item.service)}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-slate-900 border border-white/5 text-slate-400 text-[10px] rounded hover:text-slate-200 transition">
                        {getLabel(item.referral)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-extrabold text-[10px] inline-flex items-center gap-1" style={{ color: getBadgeColor(item.payment_type) }}>
                        <span>●</span>
                        <span>{getLabel(item.payment_type)}</span>
                      </span>
                    </td>
                    <td className="p-4 text-left font-mono font-bold text-slate-200">
                      {totalVal.toLocaleString("fa-IR")} تومان
                    </td>
                    <td className="p-4 text-left font-mono font-black text-emerald-400">
                      {cashPortion.toLocaleString("fa-IR")} تومان
                      {isPty3 && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1 py-0.5 rounded-md mr-1 select-none">
                          سهم ۵۰٪ نقد
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-left font-mono font-black text-amber-400">
                      {installmentPortion.toLocaleString("fa-IR")} تومان
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 text-[10px] font-black rounded-lg inline-flex items-center gap-1 border" style={{ backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30`, color: statusColor }}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
