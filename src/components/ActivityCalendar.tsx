/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Activity, Lead } from "../types";
import { CRMDatabase } from "../utils/db";
import { Calendar as CalendarIcon, CheckCircle2, AlertTriangle, Phone, Flame, Check, Info } from "lucide-react";

interface ActivityCalendarProps {
  onSelectLead: (leadId: string) => void;
  onRefresh: () => void;
}

export default function ActivityCalendar({ onSelectLead, onRefresh }: ActivityCalendarProps) {
  // June 2026 layout coordinates
  // June 1, 2026 is a Monday. June has 30 days.
  const DAYS_IN_JUNE = 30;
  const STARTING_DAY_OFFSET = 1; // Monday (0=Sunday, 1=Monday, 2=Tuesday, etc.)

  const [selectedDay, setSelectedDay] = useState<number | null>(1); // default to June 1 (Today)

  const activities = CRMDatabase.getActivities();
  const leads = CRMDatabase.getLeads();

  const getDayActivities = (day: number) => {
    // Format: YYYY-MM-DD -> June is 06, June day with padding
    const formattedDate = `2026-06-${String(day).padStart(2, "0")}`;
    
    // Also include May 31 for overdue, but let's strictly categorize them by day.
    // If we select Day 1 (June 1), also include any overdue task for visual convenience during demo.
    let list = activities.filter((a) => a.scheduled_date === formattedDate);
    
    // Overdue edge case convenience (May tasks)
    if (day === 1) {
      const overdueMay = activities.filter((a) => a.scheduled_date.startsWith("2026-05") && !a.is_done);
      list = [...list, ...overdueMay];
    }
    return list;
  };

  const handleToggleDone = (id: string) => {
    CRMDatabase.toggleActivityDone(id);
    onRefresh();
  };

  // Generate calendar grid items: empty cells for offset, then days 1-30
  const gridCells: Array<{ type: "empty" | "day"; dayNumber?: number }> = [];
  
  // Fill starting offsets
  for (let i = 0; i < STARTING_DAY_OFFSET; i++) {
    gridCells.push({ type: "empty" });
  }

  // Fill day cells
  for (let d = 1; d <= DAYS_IN_JUNE; d++) {
    gridCells.push({ type: "day", dayNumber: d });
  }

  const activeDayTasks = selectedDay ? getDayActivities(selectedDay) : [];

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "critical": return "text-rose-400 bg-rose-500/10 border-rose-500/25";
      case "high": return "text-amber-400 bg-amber-500/10 border-amber-500/25";
      case "medium": return "text-cyan-400 bg-cyan-500/10 border-cyan-500/25";
      default: return "text-slate-400 bg-slate-500/10 border-white/5";
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl text-right" id="activity-calendar-board">
      <div className="flex items-center gap-2.5 border-b border-white/5 pb-4 mb-5">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
          <CalendarIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">کارپوشه تقویمی و روزشمار پیگیری‌ها</h2>
          <p className="text-xs text-slate-400">نمای فرآیندی کارهای زمانبندی شده همکاران در ماه ژوئن ۲۰۲۶</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Calendar Grid (Lg 7 columns) */}
        <div className="lg:col-span-7 bg-slate-900/15 p-4 rounded-xl border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-300">ژوئن June 2026</span>
            <span className="text-[10px] text-slate-500">منطبق بر تقویم سالیانه عملیاتی</span>
          </div>

          {/* Weekdays Labels */}
          <div className="grid grid-cols-7 text-center text-[10px] text-slate-400 pb-2 border-b border-white/5 font-semibold">
            <div>یکشنبه (Su)</div>
            <div>دوشنبه (Mo)</div>
            <div>سه‌شنبه (Tu)</div>
            <div>چهارشنبه (We)</div>
            <div>پنجشنبه (Th)</div>
            <div>جمعه (Fr)</div>
            <div>شنبه (Sa)</div>
          </div>

          {/* Date days grid */}
          <div className="grid grid-cols-7 gap-1.5 min-h-[220px]">
            {gridCells.map((cell, index) => {
              if (cell.type === "empty") {
                return <div key={`empty-${index}`} className="bg-transparent" />;
              }

              const dayNum = cell.dayNumber!;
              const dayTasks = getDayActivities(dayNum);
              const pendingCount = dayTasks.filter((t) => !t.is_done).length;
              const hasCritical = dayTasks.some((t) => t.priority === "critical" && !t.is_done);
              const isSelected = selectedDay === dayNum;

              return (
                <button
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`p-2 rounded-lg border text-right relative flex flex-col justify-between transition-all min-h-[50px] cursor-pointer hover:bg-slate-800/40 ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                      : "bg-slate-950/20 border-white/5 text-slate-300"
                  }`}
                  id={`calendar-day-btn-${dayNum}`}
                >
                  <span className="text-xs font-bold font-mono">{dayNum}</span>
                  
                  {/* Task counts indicator badges */}
                  {dayTasks.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      {hasCritical && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 left-1" />
                      )}
                      
                      {pendingCount > 0 ? (
                        <span className={`text-[8px] font-bold px-1 rounded-full ${
                          hasCritical ? "bg-rose-500/20 text-rose-400" : "bg-cyan-500/20 text-cyan-400"
                        }`}>
                          {pendingCount}
                        </span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> فوریت بحرانی / قرمز</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500" /> کارهای باز پیگیری</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> کار به اتمام رسیده</span>
          </div>
        </div>

        {/* Selected Day Agenda Box (Lg 5 columns) */}
        <div className="lg:col-span-5 flex flex-col h-full bg-slate-900/10 border border-white/5 rounded-xl p-4 text-right">
          <div className="border-b border-white/5 pb-2 mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">جزئیات روز {selectedDay} ژوئن</span>
            <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">
              {activeDayTasks.length} وظیفه
            </span>
          </div>

          {activeDayTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 my-auto">
              هیچ برنامه یا تماس تلفنی برای این روز معین تدارک دیده نشده است
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[290px] pr-1">
              {activeDayTasks.map((task) => {
                const linkedLead = leads.find((l) => l.id === task.lead_id);
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border space-y-2 transition-all ${
                      task.is_done
                        ? "bg-emerald-950/5 border-emerald-500/10 opacity-60"
                        : "bg-slate-900/40 border-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => handleToggleDone(task.id)}
                          className="w-4 h-4 p-0 shrink-0 border border-white/20 rounded cursor-pointer flex items-center justify-center hover:bg-white/10 mt-0.5 overflow-visible"
                        >
                          {task.is_done && <Check className="w-3 h-3 text-emerald-400" />}
                        </button>
                        <p className={`text-xs font-semibold text-slate-200 ${task.is_done ? "line-through text-slate-500" : ""}`}>
                          {task.title}
                        </p>
                      </div>

                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                        {task.priority === "critical" ? "آنی" : task.priority === "high" ? "مهم" : "متوسط"}
                      </span>
                    </div>

                    {/* Linked Client link and hour */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                      {linkedLead ? (
                        <button
                          onClick={() => onSelectLead(linkedLead.id)}
                          className="hover:text-emerald-400 transition cursor-pointer text-right shrink"
                        >
                          کلاینت: <strong className="underline font-medium">{linkedLead.full_name}</strong>
                        </button>
                      ) : (
                        <span>پرونده نامعلوم</span>
                      )}

                      <span className="font-mono text-left">{task.scheduled_time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
