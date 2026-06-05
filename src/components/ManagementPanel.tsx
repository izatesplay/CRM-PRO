/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { User, CustomFieldDefinition } from "../types";
import { CRMDatabase } from "../utils/db";
import DropdownManager from "./DropdownManager";
import AnalysisDashboard from "./AnalysisDashboard";
import ExcelImporter from "./ExcelImporter";
import { 
  Users, 
  Settings, 
  Layers, 
  BarChart3, 
  Upload, 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Trash2, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Download
} from "lucide-react";

interface ManagementPanelProps {
  activeUser: User;
  onRefreshData: () => void;
}

export default function ManagementPanel({ activeUser, onRefreshData }: ManagementPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<"analysis" | "dropdowns" | "excel" | "approvals" | "fields">("analysis");
  const [usersList, setUsersList] = useState<User[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [disabledSystemFields, setDisabledSystemFields] = useState<string[]>([]);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<"text" | "number" | "boolean" | "dropdown">("text");
  
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = () => {
    setUsersList(CRMDatabase.getUsers());
    setCustomFields(CRMDatabase.getCustomFields());
    setDisabledSystemFields(CRMDatabase.getDisabledSystemFields());
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerNotify = (msg: string, isError: boolean = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(""), 3500);
    } else {
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(""), 3500);
    }
  };

  const handleExportAllToExcel = () => {
    try {
      const allLeads = CRMDatabase.getLeads();
      const customDefs = CRMDatabase.getCustomFields();
      
      const dataRows = allLeads.map((lead) => {
        const row: Record<string, any> = {
          "شناسه پرونده": lead.id,
          "نام و نام خانوادگی": lead.full_name,
          "شماره تماس": lead.mobile || "خالی",
          "مرجع معرفی": lead.referral || "عمومی",
          "منبع جذب": lead.lead_source || "نامشخص",
          "نوع خدمت اصلی": lead.service || "نامشخص",
          "زیرخدمت": lead.sub_service || "خالی",
          "مرحله پرونده": lead.module_type === "lead" ? "سرنخ خام" : "فرصت فعال ارزیابی",
          "وضعیت در چرخه سرنخ": lead.lead_status || "---",
          "وضعیت در چرخه فرصت": lead.opportunity_status || "---",
          "شرح چالش ثبت شده": lead.request_challenge || "بدون شرح",
          "متن الگو پیامک": lead.sms_text || "خالی",
          "ارزش پروژه (تومان)": lead.price ? Number(lead.price).toLocaleString("fa-IR") : "---",
          "مدل فرآیند مالی": lead.payment_type === "cash" ? "نقدی" : lead.payment_type === "installment" ? "اقساطی" : "کامل نشده",
          "شیوه تسویه مالی": lead.payment_method || "---",
          "تعداد اقساط": lead.installments_count || "---",
          "تاریخ گشایش پرونده": lead.created_at ? new Date(lead.created_at).toLocaleDateString("fa-IR") : "---",
          "تاریخ ثبت قطعی قرارداد": lead.converted_at ? new Date(lead.converted_at).toLocaleDateString("fa-IR") : "---",
        };

        customDefs.forEach((def) => {
          const val = lead.custom_fields?.[def.key];
          row[`فیلد سفارشی: ${def.label}`] = val === undefined || val === null ? "خالی" : String(val);
        });

        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(dataRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "لیست یکپارچه پرونده‌ها");

      XLSX.writeFile(workbook, `CRM-Report-All-Leads-${new Date().toISOString().split('T')[0]}.xlsx`);
      triggerNotify("گزارش اکسل جامع با موفقیت دانلود شد.");
    } catch (err: any) {
      console.error(err);
      triggerNotify("خطا در ایجاد خروجی اکسل کامل سیستم", true);
    }
  };

  const handleApproveUser = (userId: string) => {
    try {
      const targetUser = usersList.find(u => u.id === userId);
      if (targetUser && targetUser.role === "admin" && activeUser.username.toLowerCase() !== "izatesplay") {
        triggerNotify("تنها حساب کاربری مالک اصلی (izatesplay) صلاحیت تایید مدیران دیگر را دارد.", true);
        return;
      }
      CRMDatabase.updateUser(userId, { approved: true });
      loadData();
      triggerNotify("حساب کاربری مورد نظر با موفقیت تایید و فعال شد.");
      onRefreshData();
    } catch (err: any) {
      triggerNotify("خطا در تایید کاربر", true);
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === activeUser.id) {
      triggerNotify("شما نمی‌توانید حساب فعال خود را حذف کنید!", true);
      return;
    }
    try {
      CRMDatabase.deleteUser(userId);
      loadData();
      triggerNotify("حساب کاربری با موفقیت حذف گردید.");
      onRefreshData();
    } catch (err: any) {
      triggerNotify("خطا در حذف کاربر", true);
    }
  };

  const handleToggleSystemField = (fieldKey: string) => {
    try {
      const current = CRMDatabase.getDisabledSystemFields();
      let updated: string[];
      if (current.includes(fieldKey)) {
        updated = current.filter(k => k !== fieldKey);
        triggerNotify(`عرضه فیلد سیستمی تغییر نمود.`);
      } else {
        updated = [...current, fieldKey];
        triggerNotify(`فیلد سیستمی غیرفعال گردید.`);
      }
      CRMDatabase.saveDisabledSystemFields(updated);
      setDisabledSystemFields(updated);
      onRefreshData();
    } catch (err: any) {
      triggerNotify("خطا در تغییر وضعیت فیلد سیستمی", true);
    }
  };

  const handleToggleField = (fieldId: string) => {
    try {
      const field = customFields.find(f => f.id === fieldId);
      if (field) {
        CRMDatabase.updateCustomField(fieldId, { enabled: !field.enabled });
        loadData();
        triggerNotify("وضعیت نمایش فیلد داده با موفقیت تغییر کرد.");
        onRefreshData();
      }
    } catch (err: any) {
      triggerNotify("خطا در بروزرسانی وضعیت فیلد", true);
    }
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldKey.trim() || !newFieldLabel.trim()) {
      triggerNotify("لطفا شناسه انگلیسی و برچسب فارسی فیلد را وارد کنید.", true);
      return;
    }

    // Key must be lowercase alphanumeric only
    const cleanKey = newFieldKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanKey) {
      triggerNotify("شناسه انگلیسی فیلد نامعتبر است (از حروف a-z و اعداد استفاده کنید).", true);
      return;
    }

    // Avoid conflicting with primary fields
    const reserved = ["id", "full_name", "mobile", "referral", "lead_source", "service", "sub_service", "lead_status", "request_challenge", "sms_text", "module_type", "opportunity_status", "consultant", "price", "payment_type", "payment_method", "created_at", "converted_at", "is_starred"];
    if (reserved.includes(cleanKey) || customFields.some(f => f.key === cleanKey)) {
      triggerNotify("این فیلد یا شناسه قبلا در سیستم وجود داشته یا رزرو شده است.", true);
      return;
    }

    try {
      CRMDatabase.addCustomField({
        key: cleanKey,
        label: newFieldLabel.trim(),
        type: newFieldType,
        enabled: true
      });
      setNewFieldKey("");
      setNewFieldLabel("");
      setNewFieldType("text");
      loadData();
      triggerNotify("فیلد اطلاعاتی سفارشی جدید با موفقیت ایجاد و فعال شد.");
      onRefreshData();
    } catch (err: any) {
      triggerNotify("خطا در ذخیره‌سازی فیلد جدید", true);
    }
  };

  const handleDeleteField = (fieldId: string) => {
    try {
      CRMDatabase.deleteCustomField(fieldId);
      loadData();
      triggerNotify("فیلد سفارشی مورد نظر از سیستم خارج شد.");
      onRefreshData();
    } catch (err: any) {
      triggerNotify("خطا در حذف فیلد سفارشی", true);
    }
  };

  return (
    <div className="space-y-6 text-right" id="management-hub-root" dir="rtl">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-cyan-400 rotate-45" />
            <span>مرکز یکپارچه پنل مدیریت سیستم CRM</span>
          </h1>
          <p className="text-xs text-slate-400">
            مدیریت فیلدها، تحلیل نمودارها، تایید هویت کاربران و درون‌ریزی اطلاعات را در این پنل کنترل نمایید.
          </p>
        </div>

        {/* Global Feedback Notifications inside panel */}
        <div className="min-w-[200px]">
          {statusMessage && (
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-1.5 animate-fadeIn">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-1.5 animate-fadeIn">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Internal Ribbon SwitcherTabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-1">
        <button
          onClick={() => setActiveSubTab("analysis")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
            activeSubTab === "analysis"
              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
              : "bg-transparent border-transparent text-slate-400 hover:bg-white/5"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>تحلیل هوشمند (نمودارها)</span>
        </button>

        {(activeUser.role === "admin" || activeUser.role === "developer") && (
          <button
            onClick={() => setActiveSubTab("fields")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
              activeSubTab === "fields"
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-transparent border-transparent text-slate-400 hover:bg-white/5"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>تنظیم فیلدهای اطلاعاتی لید</span>
          </button>
        )}

        {(activeUser.role === "admin" || activeUser.role === "developer") && (
          <button
            onClick={() => setActiveSubTab("dropdowns")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
              activeSubTab === "dropdowns"
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-transparent border-transparent text-slate-400 hover:bg-white/5"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>تنظیمات پایه (فرهنگ لغات)</span>
          </button>
        )}

        {(activeUser.role === "admin" || activeUser.role === "developer") && (
          <button
            onClick={() => setActiveSubTab("approvals")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer relative ${
              activeSubTab === "approvals"
                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                : "bg-transparent border-transparent text-slate-400 hover:bg-white/5"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>مدیریت کاربران و تایید عضویت</span>
            {usersList.filter(u => u.username.toLowerCase() !== "izatesplay" && !u.approved).length > 0 && (
              <span className="absolute -top-1 -left-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            )}
          </button>
        )}

        <button
          onClick={() => setActiveSubTab("excel")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
            activeSubTab === "excel"
              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
              : "bg-transparent border-transparent text-slate-400 hover:bg-white/5"
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>درون‌ریزی گروهی اکسل</span>
        </button>

        {/* Global Full Excel Export */}
        <button
          onClick={handleExportAllToExcel}
          className="mr-auto flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-emerald-500/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 cursor-pointer transition-all active:scale-95 duration-200"
          title="خروجی کامل به فرمت اکسل استاندارد"
        >
          <Download className="w-4 h-4 icon-glow" />
          <span>خروجی اکسل سراسری پرونده‌ها</span>
        </button>
      </div>

      {/* Render selected modules within Admin Space */}
      <div className="pt-2">
        {activeSubTab === "analysis" && (
          <div className="animate-fadeIn">
            <AnalysisDashboard />
          </div>
        )}

        {activeSubTab === "dropdowns" && (
          <div className="animate-fadeIn">
            <DropdownManager onChanged={onRefreshData} />
          </div>
        )}

        {activeSubTab === "excel" && (
          <div className="animate-fadeIn">
            <ExcelImporter 
              activeUser={activeUser} 
              onImportComplete={() => {
                triggerNotify("عملیات بارگذاری اکسل با موفقیت بازتاب یافت.");
                setActiveSubTab("analysis");
                onRefreshData();
              }} 
              onCancel={() => setActiveSubTab("analysis")} 
            />
          </div>
        )}

        {activeSubTab === "approvals" && (
          <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200">مدیریت تایید هویت و سطوح دسترسی همکاران</h3>
                <p className="text-[11px] text-slate-400">ثبت‌نام‌های جدید پیش از تایید توسط شما قادر به عبور از دروازه ورود نخواهند بود.</p>
              </div>
              <button 
                onClick={loadData}
                className="p-1.5 bg-slate-900/40 hover:bg-slate-900/80 border border-white/5 text-slate-400 hover:text-white rounded-lg cursor-pointer flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[10px]">بروزرسانی جدول</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/60 text-slate-300">
                  <tr>
                    <th className="p-3">نام و نام خانوادگی</th>
                    <th className="p-3">نام کاربری</th>
                    <th className="p-3">پست الکترونیکی</th>
                    <th className="p-3">نقش سازمانی</th>
                    <th className="p-3">وضعیت تایید</th>
                    <th className="p-3 text-center">عملیات نظارتی ادمین</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">هیچ کاربری در دیتابیس ثبت نشده است.</td>
                    </tr>
                  ) : (
                    usersList.map((usr) => {
                      const isUserApproved = usr.username.toLowerCase() === "izatesplay" ? true : usr.approved;
                      const isAdminRole = usr.role === "admin";
                      const canCurrentAdminApprove = !isAdminRole || activeUser.username.toLowerCase() === "izatesplay";
                      
                      return (
                        <tr key={usr.id} className="hover:bg-slate-900/30 transition">
                          <td className="p-3 font-semibold text-slate-200">{usr.full_name}</td>
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{usr.username}</td>
                          <td className="p-3 text-slate-400">{usr.email || "---"}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              usr.role === "admin" 
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : usr.role === "supervisor"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {usr.role === "admin" ? "مدیر" : usr.role === "supervisor" ? "سرپرست" : "کارشناس فروش"}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 font-bold ${isUserApproved ? "text-emerald-400" : "text-rose-400 animate-pulse"}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span>{isUserApproved ? "تایید شده و فعال" : "در انتظار تایید ادمین"}</span>
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              {!isUserApproved && (
                                <button
                                  onClick={() => {
                                    if (!canCurrentAdminApprove) {
                                      triggerNotify("تنها حساب کاربری izatesplay مجاز به تایید مدیران جدید است.", true);
                                      return;
                                    }
                                    handleApproveUser(usr.id);
                                  }}
                                  disabled={!canCurrentAdminApprove}
                                  className={`p-1 px-3 border rounded-lg text-[10px] cursor-pointer font-bold flex items-center gap-1 transition ${
                                    canCurrentAdminApprove 
                                      ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20" 
                                      : "bg-slate-900/40 text-slate-500 border-white/5 cursor-not-allowed"
                                  }`}
                                  title={!canCurrentAdminApprove ? "نیازمند تایید توسط مالک اصلی (izatesplay)" : "تایید عضویت همکار"}
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>{isAdminRole && !canCurrentAdminApprove ? "مخصوص izatesplay" : "تایید عضویت"}</span>
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleDeleteUser(usr.id)}
                                disabled={usr.id === activeUser.id || usr.username.toLowerCase() === "izatesplay"}
                                className="p-1 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] cursor-pointer flex items-center gap-1 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                title={usr.username.toLowerCase() === "izatesplay" ? "حساب کاربری اصلی غیرقابل حذف است" : "حذف حساب"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === "fields" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
            
            {/* Custom fields addition column */}
            <div className="lg:col-span-1 glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>تعریف فیلد سفارشی جدید لید</span>
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                در صورتی که می‌خواهید گزینه‌های جدیدی مانند "استان"، "کد پستی"، "شماره ثابت" و ... به پرونده‌های لیدها اضافه و توسط مشاوران تکمیل گردد، در کادر زیر تعریف کنید.
              </p>
              
              <form onSubmit={handleAddCustomField} className="space-y-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">شناسه یکتای فنی (انگلیسی حروف کوچک) *</label>
                  <input
                    type="text"
                    placeholder="مثلا: province"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    className="w-full glass-input text-xs p-2.5 rounded-xl text-left font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">عنوان فارسی فیلد (نمایش در فرم‌ها) *</label>
                  <input
                    type="text"
                    placeholder="مثلا: استان محل سکونت"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="w-full glass-input text-xs p-2.5 rounded-xl text-right"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">نوع مقدار ورودی فیلد</label>
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as any)}
                    className="w-full glass-input text-xs p-2.5 rounded-xl text-right bg-slate-900 cursor-pointer"
                  >
                    <option value="text">متن عادی (Text)</option>
                    <option value="number">عدد مشخص (Number)</option>
                    <option value="boolean">بلی / خیر (Checkbox)</option>
                    <option value="dropdown">لیست کشویی انتخابی (Dropdown)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-lg shadow-cyan-500/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>ثبت و فعال‌سازی فیلد جدید</span>
                </button>
              </form>
            </div>

            {/* Existing system & custom fields status list */}
            <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">وضعیت فیلدهای اطلاعاتی فعال سامانه</h3>
                <p className="text-[11px] text-slate-400">در این بخش می‌تو‌انید فیلدهای سفارشی را حذف یا فعال/غیرفعال کنید.</p>
              </div>

              {/* List of custom fields */}
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {/* Standard default fields (always present but let's label them) */}
                <span className="block text-[10px] text-slate-500 font-bold">فیلدهای هویتی پیش‌فرض سیستم (فعال/غیرفعال‌سازی فیلدهای داینامیک)</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {["full_name", "mobile", "referral", "lead_source", "service", "lead_status", "request_challenge", "sms_text", "city", "consultation_type", "company", "address", "consultant", "price", "payment_type", "payment_method"].map((defKey, idx) => {
                    const labelMap: Record<string, string> = {
                      full_name: "نام و نام خانوادگی",
                      mobile: "شماره تلفن همراه",
                      referral: "ارجاع داده شده به",
                      lead_source: "منبع جذب مشتری",
                      service: "سرویس درخواستی مشتری",
                      lead_status: "وضعیت فعلی لید",
                      request_challenge: "چالش یا توصیفات اولیه",
                      sms_text: "متن پیامک پیش نویس",
                      city: "شهر",
                      consultation_type: "نوع مشاوره",
                      company: "شرکت",
                      address: "آدرس",
                      consultant: "مشاور تخصصی (فرصت)",
                      price: "مبلغ هزینه (فرصت)",
                      payment_type: "نوع پرداخت (فرصت)",
                      payment_method: "روش پرداخت (فرصت)"
                    };
                    const isEnabled = !disabledSystemFields.includes(defKey);
                    return (
                      <div key={idx} className="p-3 bg-slate-900/10 border border-white/5 rounded-xl flex items-center justify-between text-slate-300">
                        <span>{labelMap[defKey]} <span className="text-[10px] font-mono text-slate-500">({defKey})</span></span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleSystemField(defKey)}
                            disabled={defKey === "full_name"}
                            className="p-1 cursor-pointer disabled:opacity-40"
                          >
                            {isEnabled ? (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
                                <ToggleRight className="w-4 h-4" />
                                <span>فعال</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/25">
                                <ToggleLeft className="w-4 h-4 text-rose-500" />
                                <span>غیرفعال</span>
                              </div>
                            )}
                          </button>
                          <span className="text-[10px] bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full font-bold">سیستمی</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <span className="block text-[10px] text-slate-500 font-bold pt-4">فیلدهای سفارشی و انتخابی تعریف شده توسط شما</span>
                {customFields.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-600 bg-slate-900/10 rounded-xl border border-dashed border-white/5">
                    هیچ فیلد سفارشی برای لیدها ایجاد نشده است.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 space-y-1">
                    {customFields.map((field) => (
                      <div key={field.id} className="p-3.5 bg-slate-900/30 border border-white/5 rounded-xl flex items-center justify-between gap-4 transition hover:bg-slate-900/50">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-300">{field.label}</span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span>کد: {field.key}</span>
                            <span>|</span>
                            <span>نوع داده: {field.type === "text" ? "متنی" : field.type === "number" ? "عددی" : "بلی/خیر"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Toggle Switch */}
                          <button
                            onClick={() => handleToggleField(field.id)}
                            className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                            title={field.enabled ? "غیرفعال کردن نمایش فیلد" : "فعال کردن نمایش فیلد"}
                          >
                            {field.enabled ? (
                              <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25">
                                <ToggleRight className="w-5 h-5" />
                                <span>نمایش فعال</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/25">
                                <ToggleLeft className="w-5 h-5 text-rose-500" />
                                <span>نمایش غیرفعال</span>
                              </div>
                            )}
                          </button>

                          {/* Delete definition */}
                          <button
                            onClick={() => handleDeleteField(field.id)}
                            className="p-1 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] cursor-pointer transition flex items-center gap-1"
                            title="حذف کامل فیلد"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
