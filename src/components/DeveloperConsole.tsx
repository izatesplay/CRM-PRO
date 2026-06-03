/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { CRMDatabase } from "../utils/db";
import { User } from "../types";
import { 
  Database, 
  Terminal, 
  Activity, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Wifi, 
  WifiOff 
} from "lucide-react";

interface DeveloperConsoleProps {
  activeUser: User;
  onRefreshAllData: () => void;
}

interface LogEntry {
  timestamp: string;
  type: "info" | "error" | "success";
  message: string;
  details?: string;
}

export default function DeveloperConsole({ activeUser, onRefreshAllData }: DeveloperConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connStatus, setConnStatus] = useState<"checking" | "connected" | "error">("checking");
  const [dbMeta, setDbMeta] = useState<{ dbName?: string; tables?: string[]; message?: string }>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [expandedLogIdx, setExpandedLogIdx] = useState<number | null>(null);

  // Load logs and check connection on mount
  useEffect(() => {
    loadLogs();
    testLiveConnection();

    // Listen to custom DB log update events
    const handleLogUpdate = () => {
      loadLogs();
    };

    window.addEventListener("crm_db_logs_updated", handleLogUpdate);
    return () => {
      window.removeEventListener("crm_db_logs_updated", handleLogUpdate);
    };
  }, []);

  const loadLogs = () => {
    setLogs(CRMDatabase.getDBLogs());
  };

  const testLiveConnection = async () => {
    setConnStatus("checking");
    const status = await CRMDatabase.checkConnectionStatus();
    if (status.success) {
      setConnStatus("connected");
      setDbMeta({
        dbName: status.dbName,
        tables: status.tables,
        message: status.message
      });
    } else {
      setConnStatus("error");
      setDbMeta({
        message: status.message
      });
    }
    loadLogs();
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    const ok = await CRMDatabase.syncWithMySQL();
    setIsSyncing(false);
    loadLogs();
    if (ok) {
      onRefreshAllData();
    }
  };

  const handleForceFetch = async () => {
    setIsFetching(true);
    const ok = await CRMDatabase.fetchFromMySQL();
    setIsFetching(false);
    loadLogs();
    if (ok) {
      onRefreshAllData();
    }
  };

  const handleClearLogs = () => {
    CRMDatabase.resetDBLogs();
    loadLogs();
  };

  const formatPersianTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("fa-IR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit"
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-right" dir="rtl" id="developer-console-container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Terminal className="text-emerald-400 w-6 h-6" />
            <span>پنل مانیتورینگ دیتابیس و عیب‌یابی (Developer Connection Console)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            این پنل صرفاً جهت نظارت فنی روی جداول دیتابیس MySQL و عیب‌یابی پیوند با api.php به صورت اختصاصی برای توسعه‌دهنده فعال است.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-500/15 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 font-mono font-bold">
            نقش کاربر: {activeUser.full_name} ({activeUser.role})
          </span>
        </div>
      </div>

      {/* Grid: Live Database connection specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status widget card */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">وضعیت اتصال به هاست</span>
            {connStatus === "checking" ? (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            ) : connStatus === "connected" ? (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              connStatus === "connected" 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : connStatus === "checking" 
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}>
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">
                {connStatus === "connected" 
                  ? "متصل به پایگاه داده MySQL" 
                  : connStatus === "checking" 
                  ? "در حال پایش وضعیت..." 
                  : "قطع ارتباط / خطای اتصال"}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5" dir="ltr">
                {connStatus === "connected" ? `DB: ${dbMeta.dbName || "izates_crm_db"}` : "MySQL Error Logs Below"}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>نوع درگاه ارتباطی:</span>
            <span className="font-mono text-emerald-400">api.php Bridge API</span>
          </div>
        </div>

        {/* DB Metadata */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4 col-span-1 md:col-span-2">
          <div>
            <span className="text-xs font-semibold text-slate-300">اطلاعات تایید شده کانیفیگ پایگاه داده (MySQL Details)</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block mb-1">سرور مرجع (Host)</span>
                <span className="text-xs font-mono font-bold text-slate-200">localhost</span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block mb-1">نام دیتابیس</span>
                <span className="text-xs font-mono font-bold text-slate-200">{dbMeta.dbName || "crm_db"}</span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block mb-1">تعداد جداول فعال</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {dbMeta.tables ? dbMeta.tables.length : "0"} جدول
                </span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 text-center">
                <span className="text-[10px] text-slate-400 block mb-1">کدگذاری یونیکد</span>
                <span className="text-xs font-mono font-bold text-slate-200">utf8mb4</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center text-xs text-slate-400 pt-3 border-t border-white/5">
            <span className="text-right truncate">قیمت‌های ذخیره شده، لیدها و کاربران به دیتابیس MySQL هاست همگام‌سازی می‌شوند.</span>
            <button 
              onClick={testLiveConnection}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded border border-white/10 text-[11px] cursor-pointer flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3 h-3 animate-spin-slow" />
              <span>تست اتصال مجدد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Developer Action Utilities */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5">
        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Activity className="text-cyan-400 w-4 h-4" />
          <span>ابزارهای عیب‌یابی و سنکرون مستقیم دیتابیس (Database Operations Checkers)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={testLiveConnection}
            className="p-3 bg-slate-800/50 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl border border-white/10 transition flex flex-col items-center justify-center text-center gap-2 cursor-pointer"
          >
            <Wifi className="w-5 h-5 text-indigo-400" />
            <span>بررسی زنده سلامت دیتابیس</span>
            <span className="text-[9px] text-slate-500 font-normal">ارسال پینگ تایید شده به api.php</span>
          </button>

          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="p-3 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-500/20 transition flex flex-col items-center justify-center text-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-emerald-400 ${isSyncing ? "animate-spin" : ""}`} />
            <span>اجبار به سنکرون دستی (Push All)</span>
            <span className="text-[9px] text-slate-500 font-normal">ارسال دیتای کلاینت به دیتابیس هاست</span>
          </button>

          <button
            onClick={handleForceFetch}
            disabled={isFetching}
            className="p-3 bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-300 text-xs font-semibold rounded-xl border border-cyan-500/20 transition flex flex-col items-center justify-center text-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Database className={`w-5 h-5 text-cyan-400 ${isFetching ? "animate-spin" : ""}`} />
            <span>بازخوانی مجدد اطلاعات (Pull All)</span>
            <span className="text-[9px] text-slate-500 font-normal">دانلود اطلاعات خام ثبت شده در MySQL</span>
          </button>

          <button
            onClick={handleClearLogs}
            className="p-3 bg-rose-500/10 hover:bg-rose-500/15 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/20 transition flex flex-col items-center justify-center text-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-5 h-5 text-rose-400" />
            <span>پاکسازی کامل لاگ‌های محلی</span>
            <span className="text-[9px] text-slate-500 font-normal">تخلیه لاگ‌های ثبت شده در مرورگر شما</span>
          </button>
        </div>
      </div>

      {/* Database Error logs & activity terminal console */}
      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="text-cyan-400 w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-200">گزارشات ترمینال دیتابیس (SQL Logs Console)</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">نمایش ارورها و وضعیت اتصال به تفکیک تایم‌استپ</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/20 rounded-xl border border-white/5" id="no-db-logs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p>هیچ گزارش خطا یا تراکنشی برای بررسی وجود ندارد. کلیه جریانات مالی دیتابیس کاملا آرام و امن هستند!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin id-logs-list mb-2">
            {logs.map((log, idx) => (
              <div 
                key={idx}
                className={`p-3.5 rounded-xl border transition text-right ${
                  log.type === "error" 
                    ? "bg-rose-500/5 border-rose-500/15 text-rose-200 hover:bg-rose-500/10" 
                    : log.type === "success"
                    ? "bg-emerald-500/5 border-emerald-500/15 text-emerald-200 hover:bg-emerald-500/10"
                    : "bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-850"
                }`}
                id={`db-log-item-${idx}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2 text-right">
                    <div className="mt-1 shrink-0">
                      {log.type === "error" ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      ) : log.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-normal">{log.message}</p>
                      {log.details && (
                        <button 
                          onClick={() => setExpandedLogIdx(expandedLogIdx === idx ? null : idx)}
                          className={`text-[10px] underline block mt-1.5 cursor-pointer font-medium ${
                            log.type === "error" ? "text-rose-450 hover:text-rose-350" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {expandedLogIdx === idx ? "بستن جزئیات خطای فنی ❌" : "نمایش جزئیات پاسخ سرویس 🛠️"}
                        </button>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500/90 whitespace-nowrap pt-0.5 dir-ltr font-mono font-medium">
                    {formatPersianTime(log.timestamp)}
                  </span>
                </div>

                {expandedLogIdx === idx && log.details && (
                  <div className="mt-3 p-3 bg-slate-950/60 border border-white/5 rounded-lg text-left overflow-x-auto" dir="ltr">
                    <pre className="text-[10px] font-mono text-cyan-400 font-medium whitespace-pre-wrap leading-relaxed select-all">
                      {log.details}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
