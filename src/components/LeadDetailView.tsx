/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Lead, Activity, Note, AuditLog, User } from "../types";
import { CRMDatabase } from "../utils/db";
import {
  Calendar,
  FileText,
  History,
  Plus,
  PhoneCall,
  Users,
  CheckSquare,
  Square,
  Trash2,
  HeartHandshake,
  LayoutDashboard,
  Info,
  RefreshCw,
  Mail,
  FolderClosed,
  ShoppingBag,
  Megaphone,
  Layers,
  MessageSquare,
  ArrowLeftRight,
  User as UserIcon,
  Search,
  MoreVertical,
  Check,
  X,
  Edit2,
  Lock,
  ChevronRight,
  Globe,
  Bell,
  Menu
} from "lucide-react";

interface LeadDetailViewProps {
  lead: Lead;
  activeUser: User;
  onChanged: () => void;
  onClose: () => void;
}

export default function LeadDetailView({ lead, activeUser, onChanged, onClose }: LeadDetailViewProps) {
  // Navigation tabs of the right sidebar in the ERP interface
  // "خلاصه" (Summary) is the active bento dashboard showing the screen requested by the user
  const [activeSidebarTab, setActiveSidebarTab] = useState<string>("summary");

  // Inside "Summary", we also have the secondary workspace tab block to see Notes or Logs directly
  const [activeSummaryTab, setActiveSummaryTab] = useState<"activities" | "notes" | "audit">("activities");

  // Inline Editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");

  // New Note state
  const [noteContent, setNoteContent] = useState("");
  const [isOpenNoteToggle, setIsOpenNoteToggle] = useState(true);

  // New Activity state
  const [actTitle, setActTitle] = useState("");
  const [actType, setActType] = useState<"call" | "meeting" | "mobile_call">("call");
  const [actPriority, setActPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [actDate, setActDate] = useState("");
  const [actTime, setActTime] = useState("");
  const [showAddActivityForm, setShowAddActivityForm] = useState(false);

  // Convert to Opportunity states
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [selectedOppStatus, setSelectedOppStatus] = useState("");
  const [dealPrice, setDealPrice] = useState("");

  // In-place click confirmation states
  const [deleteConfirmActId, setDeleteConfirmActId] = useState<string | null>(null);
  const [deleteConfirmNoteId, setDeleteConfirmNoteId] = useState<string | null>(null);

  const dropdowns = CRMDatabase.getDropdowns();
  const getLabel = (id?: string) => dropdowns.find((o) => o.id === id)?.label || id || "-";
  const getColor = (id?: string) => dropdowns.find((o) => o.id === id)?.color || "#94a3b8";

  // Filter linked records for this specific lead
  const activities = CRMDatabase.getActivities().filter((a) => a.lead_id === lead.id);
  const notes = CRMDatabase.getNotes().filter((n) => n.lead_id === lead.id);
  const auditLogs = CRMDatabase.getAuditLogs().filter((l) => l.lead_id === lead.id);

  // Dropdown options lists for custom selection in inline editing
  const referralList = dropdowns.filter((o) => o.category === "referral");
  const sourceList = dropdowns.filter((o) => o.category === "lead_source");
  const serviceList = dropdowns.filter((o) => o.category === "service");
  const subServiceList = dropdowns.filter((o) => o.category === "sub_service");
  const statusList = dropdowns.filter((o) => o.category === "lead_status");
  const oppStatusList = dropdowns.filter((o) => o.category === "opportunity_status");
  const consultantList = dropdowns.filter((o) => o.category === "consultant");
  const paymentTypeList = dropdowns.filter((o) => o.category === "payment_type");
  const paymentMethodList = dropdowns.filter((o) => o.category === "payment_method");

  const startInlineEdit = (field: string, initialVal: string) => {
    setEditingField(field);
    setInlineEditValue(initialVal || "");
  };

  const cancelInlineEdit = () => {
    setEditingField(null);
    setInlineEditValue("");
  };

  const saveInlineEdit = (field: string) => {
    // Perform updates in the DB
    let finalValue: any = inlineEditValue;
    if (field === "price") {
      finalValue = Number(finalValue) || 0;
    }
    CRMDatabase.updateLead(lead.id, { [field]: finalValue }, activeUser);
    setEditingField(null);
    setInlineEditValue("");
    onChanged();
  };

  const handleConfirmConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOppStatus) return;

    CRMDatabase.updateLead(
      lead.id,
      {
        module_type: "opportunity",
        opportunity_status: selectedOppStatus,
        price: Number(dealPrice) || 0,
        payment_type: "cash",
        payment_method: "one_time"
      },
      activeUser
    );

    setShowConvertForm(false);
    onChanged();
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    CRMDatabase.addNote({
      lead_id: lead.id,
      content: noteContent.trim(),
      author_name: activeUser.full_name,
    });

    setNoteContent("");
    onChanged();
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim() || !actDate || !actTime) return;

    CRMDatabase.addActivity({
      lead_id: lead.id,
      title: actTitle.trim(),
      activity_type: actType,
      priority: actPriority,
      scheduled_date: actDate,
      scheduled_time: actTime,
      is_done: false,
      author_name: activeUser.full_name,
    });

    // Alert reminder setup
    CRMDatabase.addNotification({
      user_id: activeUser.id,
      title: "یادآوری کار برنامه‌ریزی شده",
      message: `فعالیت جدید "${actTitle.trim()}" برای مشتری ${lead.full_name} در ساعت ${actTime} ثبت شد.`,
      lead_id: lead.id,
      notification_type: "activity_reminder",
      is_read: false
    });

    setActTitle("");
    setActDate("");
    setActTime("");
    setShowAddActivityForm(false);
    onChanged();
  };

  const handleToggleActivity = (id: string) => {
    CRMDatabase.toggleActivityDone(id);
    onChanged();
  };

  const handleDeleteActivity = (id: string) => {
    setDeleteConfirmActId(id);
  };

  const handleDeleteNote = (id: string) => {
    setDeleteConfirmNoteId(id);
  };

  // Helper helper to render standard date
  const formatPersianDate = (dateIso?: string) => {
    if (!dateIso) return "۱۴۰۵-۰۳-۱۱ ۱۱:۲۹ AM";
    try {
      const date = new Date(dateIso);
      return date.toLocaleDateString("fa-IR") + " " + date.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "۱۴۰۵-۰۳-۱۱ ۱۱:۲۹ AM";
    }
  };

  // Sidebar dynamic navigation configuration
  const sidebarItems = [
    { id: "summary", label: "خلاصه", icon: LayoutDashboard, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { id: "info", label: "اطلاعات", icon: Info, color: "text-slate-500" },
    { id: "updates", label: "بروزرسانی ها", icon: RefreshCw, color: "text-slate-500" },
    { id: "notes", label: "یادداشت ها", icon: FileText, color: "text-slate-500" },
    { id: "activities", label: "فعالیت ها", icon: Calendar, color: "text-slate-500" },
    { id: "emails", label: "ایمیل ها", icon: Mail, color: "text-slate-500" },
    { id: "products", label: "محصولات", icon: ShoppingBag, color: "text-slate-500" },
    { id: "campaigns", label: "کمپین های تبلیغاتی", icon: Megaphone, color: "text-slate-500" },
    { id: "services", label: "سرویس ها", icon: Layers, color: "text-slate-500" },
    { id: "phone_calls", label: "تماس های تلفنی", icon: PhoneCall, color: "text-slate-500" },
    { id: "messengers", label: "پیام رسان ها", icon: MessageSquare, color: "text-slate-500" },
  ];

  return (
    <div className="w-full bg-slate-950/80 rounded-2xl border border-white/5 shadow-2xl relative text-right flex flex-col lg:flex-row min-h-[750px] overflow-hidden" dir="rtl" id="lead-spec-drawer">
      
      {/* 1. Main Content Area (On the left in RTL, takes up flex-1) */}
      <div className="flex-1 p-6 space-y-6 flex flex-col justify-start">
        
        {/* Breadcrumb Header matching top row */}
        <div className="flex items-center justify-between bg-slate-900/40 p-3.5 rounded-xl border border-white/5 select-none animate-fadeIn">
          {/* Breadcrumb navigation paths */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">سرنخ‌های فروش</span>
            <span className="text-xs text-slate-500">&gt;</span>
            <span className="text-xs font-bold text-slate-200">{lead.full_name}</span>
            
            {/* Back action key with door exit icon */}
            <button
              onClick={onClose}
              className="mr-3 p-1.5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg cursor-pointer transition flex items-center justify-center gap-1 border border-white/5"
              title="خروج و بازگشت به مخزن پرونده‌ها"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="text-[10px]">بازگشت</span>
            </button>

            {lead.module_type === "lead" && (
              <button
                onClick={() => {
                  setSelectedOppStatus(oppStatusList[0]?.id || "");
                  setDealPrice("");
                  setShowConvertForm(true);
                }}
                className="mr-2 p-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition flex items-center justify-center gap-2 border border-emerald-500 font-bold text-[10px] shadow"
                title="تبدیل سرنخ فروش فعلی به فرصت"
              >
                <RefreshCw className="w-3 h-3 text-emerald-200" />
                <span>تبدیل به فرصت</span>
              </button>
            )}
          </div>

          {/* User profile identifier and main menu settings */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950/40 p-1 px-3 rounded-xl border border-white/5">
              <span className="text-[10px] font-mono text-slate-400">کاربر: {activeUser.full_name}</span>
              <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <UserIcon className="w-3 h-3" />
              </div>
            </div>
            <button className="p-1 px-2.5 bg-slate-950/30 text-slate-400 hover:text-slate-200 rounded-lg text-xs border border-white/5 flex items-center gap-1.5 cursor-pointer">
              <Menu className="w-3.5 h-3.5" />
              <span>منو</span>
            </button>
          </div>
        </div>

        {/* TAB WORKSPACE ROUTING */}
        {activeSidebarTab === "summary" ? (
          <>
            {/* 2. Top Grid of Info Fields (14 Rounded cards, RTL layout) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 mb-2 animate-fadeIn" id="detail-upper-field-cards">
              
              {/* Card 1: Created At (زمان ایجاد) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                <span className="text-[9px] text-slate-400 block font-semibold mb-1">زمان ایجاد</span>
                <span className="text-[10.5px] font-mono font-bold text-slate-300 text-left line-clamp-1">{formatPersianDate(lead.created_at)}</span>
              </div>

              {/* Card 2: Assigned To (ارجاع به) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                <span className="text-[9px] text-slate-400 block font-semibold mb-1">ارجاع به</span>
                {editingField === "referral" ? (
                  <select
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onBlur={() => saveInlineEdit("referral")}
                    className="w-full bg-slate-950 text-[10px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none"
                    autoFocus
                  >
                    <option value="">بلاتکلیف</option>
                    {referralList.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10.5px] font-bold text-slate-200 truncate">{getLabel(lead.referral)}</span>
                )}
                <button 
                  onClick={() => startInlineEdit("referral", lead.referral)}
                  className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

              {/* Card 3: Lead Status or Opportunity Status (وضعیت سرنخ یا فرصت) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                {lead.module_type === "opportunity" ? (
                  <>
                    <span className="text-[9px] text-slate-400 block font-semibold mb-1">وضعیت فرصت</span>
                    {editingField === "opportunity_status" ? (
                      <select
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        onBlur={() => saveInlineEdit("opportunity_status")}
                        className="w-full bg-slate-950 text-[11px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none cursor-pointer text-xs"
                        autoFocus
                      >
                        {oppStatusList.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex justify-start">
                        <span 
                          className="px-2 py-0.5 rounded text-[10px] font-black text-white line-clamp-1 inline-block"
                          style={{ backgroundColor: getColor(lead.opportunity_status) + "25", color: getColor(lead.opportunity_status), border: `1px solid ${getColor(lead.opportunity_status)}20` }}
                        >
                          {getLabel(lead.opportunity_status)}
                        </span>
                      </div>
                    )}
                    <button 
                      onClick={() => startInlineEdit("opportunity_status", lead.opportunity_status || "")}
                      className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] text-slate-400 block font-semibold mb-1">وضعیت سرنخ فروش</span>
                    {editingField === "lead_status" ? (
                      <select
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        onBlur={() => saveInlineEdit("lead_status")}
                        className="w-full bg-slate-950 text-[11px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none cursor-pointer text-xs"
                        autoFocus
                      >
                        {statusList.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex justify-start">
                        <span 
                          className="px-2 py-0.5 rounded text-[10px] font-black text-white line-clamp-1 inline-block"
                          style={{ backgroundColor: getColor(lead.lead_status) + "25", color: getColor(lead.lead_status), border: `1px solid ${getColor(lead.lead_status)}20` }}
                        >
                          {getLabel(lead.lead_status)}
                        </span>
                      </div>
                    )}
                    <button 
                      onClick={() => startInlineEdit("lead_status", lead.lead_status)}
                      className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>

              {/* Card 4: Industry (صنعت) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                <span className="text-[9px] text-slate-400 block font-semibold mb-1">صنعت</span>
                {editingField === "industry" ? (
                  <input
                    type="text"
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("industry")}
                    onBlur={() => saveInlineEdit("industry")}
                    className="w-full bg-slate-950 text-[10.5px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right"
                    autoFocus
                  />
                ) : (
                  <span className="text-[10.5px] text-slate-300 font-bold">{lead.industry || "—"}</span>
                )}
                <button 
                  onClick={() => startInlineEdit("industry", lead.industry || "")}
                  className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

              {/* Card 5: Lead Source (منبع سرنخ) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                <span className="text-[9px] text-slate-400 block font-semibold mb-1">منبع سرنخ</span>
                {editingField === "lead_source" ? (
                  <select
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onBlur={() => saveInlineEdit("lead_source")}
                    className="w-full bg-slate-950 text-[10px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none"
                    autoFocus
                  >
                    <option value="">بدون منبع</option>
                    {sourceList.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex justify-start">
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-bold inline-block"
                      style={{ backgroundColor: getColor(lead.lead_source) + "25", color: getColor(lead.lead_source) }}
                    >
                      {getLabel(lead.lead_source)}
                    </span>
                  </div>
                )}
                <button 
                  onClick={() => startInlineEdit("lead_source", lead.lead_source)}
                  className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

              {/* Card 6: Telephone (تلفن ثابت) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                <span className="text-[9px] text-slate-400 block font-semibold mb-1">تلفن</span>
                {editingField === "telephone" ? (
                  <input
                    type="text"
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("telephone")}
                    onBlur={() => saveInlineEdit("telephone")}
                    className="w-full bg-slate-950 text-[10.5px] font-mono text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-left"
                    autoFocus
                  />
                ) : (
                  <span className="text-[10.5px] font-mono text-slate-300 font-bold">{lead.telephone || "—"}</span>
                )}
                <button 
                  onClick={() => startInlineEdit("telephone", lead.telephone || "")}
                  className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

              {/* Card 7: Consultation Topic (انتخاب موضوع مشاوره) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                <span className="text-[9px] text-slate-400 block font-semibold mb-1">انتخاب موضوع مشاوره</span>
                {editingField === "consultation_topic" ? (
                  <input
                    type="text"
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("consultation_topic")}
                    onBlur={() => saveInlineEdit("consultation_topic")}
                    className="w-full bg-slate-950 text-[10.5px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right"
                    autoFocus
                  />
                ) : (
                  <span className="text-[10.5px] text-slate-300 font-bold">{lead.consultation_topic || "—"}</span>
                )}
                <button 
                  onClick={() => startInlineEdit("consultation_topic", lead.consultation_topic || "")}
                  className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

              {/* Card 8: Send SMS No Answer (ارسال پیام عدم پاسخگویی) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                <span className="text-[9px] text-slate-400 block font-semibold mb-1">ارسال پیام عدم پاسخگویی</span>
                {editingField === "send_sms_unanswered" ? (
                  <select
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onBlur={() => saveInlineEdit("send_sms_unanswered")}
                    className="w-full bg-slate-950 text-[11px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none"
                    autoFocus
                  >
                    <option value="no">خیر</option>
                    <option value="yes">بله</option>
                  </select>
                ) : (
                  <span className="text-[10.5px] font-bold text-slate-300">{lead.send_sms_unanswered === "yes" ? "بله" : "خیر"}</span>
                )}
                <button 
                  onClick={() => startInlineEdit("send_sms_unanswered", lead.send_sms_unanswered || "no")}
                  className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

              {/* Card 9: Sub-Service Category (ساب سرویس حقوقی) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                <span className="text-[9px] text-slate-400 block font-semibold mb-1">ساب سرویس حقوقی</span>
                {editingField === "sub_service" ? (
                  <select
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onBlur={() => saveInlineEdit("sub_service")}
                    className="w-full bg-slate-950 text-[10px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none"
                    autoFocus
                  >
                    <option value="">بدون زیرمنو</option>
                    {subServiceList.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[10.5px] font-bold text-slate-300 truncate">{getLabel(lead.sub_service)}</span>
                )}
                <button 
                  onClick={() => startInlineEdit("sub_service", lead.sub_service)}
                  className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

              {/* Card 10: Province (استان) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                <span className="text-[9px] text-slate-400 block font-semibold mb-1">استان</span>
                {editingField === "province" ? (
                  <input
                    type="text"
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("province")}
                    onBlur={() => saveInlineEdit("province")}
                    className="w-full bg-slate-950 text-[10.5px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right"
                    autoFocus
                  />
                ) : (
                  <span className="text-[10.5px] text-slate-300 font-bold">{lead.province || "—"}</span>
                )}
                <button 
                  onClick={() => startInlineEdit("province", lead.province || "")}
                  className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

              {/* Card 11: Service (سرویس) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                <span className="text-[9px] text-slate-400 block font-semibold mb-1">سرویس</span>
                {editingField === "service" ? (
                  <select
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onBlur={() => saveInlineEdit("service")}
                    className="w-full bg-slate-950 text-[10px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none"
                    autoFocus
                  >
                    {serviceList.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex justify-start">
                    <span 
                      className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                      style={{ backgroundColor: getColor(lead.service) + "25", color: getColor(lead.service), border: `1px solid ${getColor(lead.service)}15` }}
                    >
                      {getLabel(lead.service)}
                    </span>
                  </div>
                )}
                <button 
                  onClick={() => startInlineEdit("service", lead.service)}
                  className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

              {/* Card 12: Service Type (نوع خدمت) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                <span className="text-[9px] text-slate-400 block font-semibold mb-1">نوع خدمت</span>
                {editingField === "service_type" ? (
                  <input
                    type="text"
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("service_type")}
                    onBlur={() => saveInlineEdit("service_type")}
                    className="w-full bg-slate-950 text-[10.5px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right"
                    autoFocus
                  />
                ) : (
                  <span className="text-[10.5px] text-slate-300 font-bold">{lead.service_type || "—"}</span>
                )}
                <button 
                  onClick={() => startInlineEdit("service_type", lead.service_type || "")}
                  className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

              {/* Card 13: SMS Text - Spans two columns */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px] col-span-2">
                <span className="text-[9px] text-slate-500 block font-semibold mb-0.5">متن پیامک</span>
                {editingField === "sms_text" ? (
                  <textarea
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onBlur={() => saveInlineEdit("sms_text")}
                    rows={1}
                    className="w-full bg-slate-950 text-[10px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right resize-none"
                    autoFocus
                  />
                ) : (
                  <span className="text-[10px] text-slate-300 line-clamp-1 italic font-light">
                    {lead.sms_text ? `• ${lead.sms_text}` : "انتقال خودکار متن پیامک..."}
                  </span>
                )}
                <button 
                  onClick={() => startInlineEdit("sms_text", lead.sms_text || "")}
                  className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

              {/* Card 14: Consultation Type (نوع مشاوره) */}
              <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 relative group text-right flex flex-col justify-between min-h-[58px]">
                <span className="text-[9px] text-slate-400 block font-semibold mb-1">نوع مشاوره</span>
                {editingField === "consultation_type" ? (
                  <input
                    type="text"
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("consultation_type")}
                    onBlur={() => saveInlineEdit("consultation_type")}
                    className="w-full bg-slate-950 text-[10.5px] text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right"
                    autoFocus
                  />
                ) : (
                  <span className="text-[10.5px] text-slate-300 font-bold">{lead.consultation_type || "—"}</span>
                )}
                <button 
                  onClick={() => startInlineEdit("consultation_type", lead.consultation_type || "")}
                  className="absolute left-1.5 bottom-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>

            </div>

            {/* 3. Columns Layout below the grid (Left side for boxes, Right side for Key Fields table) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-right items-start">
              
              {/* Left side: Activities, Documents, Followers & Add-Note (Main bento column in screenshot) */}
              <div className="lg:col-span-8 space-y-4 animate-fadeIn">
                
                {/* ACTIVITIES BOX */}
                <div className="bg-slate-900/20 rounded-xl border border-white/5 p-4 space-y-3 shadow flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-200">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span>فعالیت‌ها (Activities)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowAddActivityForm(!showAddActivityForm)}
                        className={`p-1 rounded cursor-pointer transition ${
                          showAddActivityForm
                            ? "text-emerald-400 bg-emerald-500/15 border border-emerald-500/35"
                            : "text-slate-400 hover:text-emerald-400"
                        }`}
                        title="ثبت فعالیت برنامه‌ریزی شده جدید"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setShowAddActivityForm(!showAddActivityForm)}
                        className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {showAddActivityForm && (
                    <form onSubmit={handleAddActivity} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl space-y-3 text-right animate-fadeIn mb-2">
                      <p className="text-[10px] font-bold text-slate-300">افزودن فعالیت برنامه‌ریزی شده جدید:</p>
                      
                      <div>
                        <label className="block text-[9px] text-slate-400 mb-1">عنوان کار / فعالیت *</label>
                        <input
                          type="text"
                          value={actTitle}
                          onChange={(e) => setActTitle(e.target.value)}
                          placeholder="مثال: تماس پیگیری هماهنگی قرارداد"
                          className="w-full text-xs p-2 rounded-lg bg-slate-950 text-slate-200 border border-white/10"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-1">نوع کار</label>
                          <select
                            value={actType}
                            onChange={(e) => setActType(e.target.value as any)}
                            className="w-full text-xs p-1.5 rounded-lg bg-slate-950 text-slate-200 border border-white/10 cursor-pointer"
                          >
                            <option value="call">تماس تلفنی</option>
                            <option value="mobile_call">تماس همراه</option>
                            <option value="meeting">جلسه حضوری</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-1">اولویت</label>
                          <select
                            value={actPriority}
                            onChange={(e) => setActPriority(e.target.value as any)}
                            className="w-full text-xs p-1.5 rounded-lg bg-slate-950 text-slate-200 border border-white/10 cursor-pointer"
                          >
                            <option value="low">کم</option>
                            <option value="medium">متوسط</option>
                            <option value="high">بالا</option>
                            <option value="critical">بحرانی</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-1">تاریخ</label>
                          <input
                            type="date"
                            value={actDate}
                            onChange={(e) => setActDate(e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg bg-slate-950 text-slate-200 border border-white/10"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-[9px] text-slate-400 mb-1">ساعت</label>
                          <input
                            type="time"
                            value={actTime}
                            onChange={(e) => setActTime(e.target.value)}
                            className="w-full text-xs p-1.5 rounded-lg bg-slate-950 text-slate-200 border border-white/10"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddActivityForm(false)}
                          className="px-3 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                        >
                          انصراف
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer"
                        >
                          ثبت کار جدید
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                    {activities.length === 0 ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-slate-950/40 text-blue-400/40 border border-white/5 flex items-center justify-center mb-2">
                          <Calendar className="w-6 h-6" />
                        </div>
                        <span className="text-xs text-slate-400 font-bold">فعالیت جدیدی در حال انجام نمی‌باشد</span>
                        <span className="text-[9px] text-slate-500 mt-1">پیشنهاد می‌شود یک مهلت تماس تلفنی تنظیم کنید.</span>
                      </>
                    ) : (
                      <div className="w-full space-y-2 text-right">
                        {activities.slice(0, 3).map((act) => {
                          const isPendingActDelete = deleteConfirmActId === act.id;
                          return (
                            <div key={act.id} className="p-2 bg-slate-950/50 rounded-lg border border-white/5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <button onClick={() => handleToggleActivity(act.id)} className="text-emerald-400 cursor-pointer shrink-0">
                                  {act.is_done ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                </button>
                                <span className={`truncate ${act.is_done ? "line-through text-slate-500" : "text-slate-200 font-medium"}`}>{act.title}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isPendingActDelete ? (
                                  <div className="flex items-center gap-1.5 text-[10px] bg-rose-950/55 border border-rose-500/40 px-2 py-0.5 rounded animate-fadeIn">
                                    <span className="text-rose-300 font-extrabold text-[9px]">حذف؟</span>
                                    <button
                                      onClick={() => {
                                        CRMDatabase.deleteActivity(act.id);
                                        onChanged();
                                        setDeleteConfirmActId(null);
                                      }}
                                      className="text-emerald-400 hover:underline font-extrabold text-[9px] cursor-pointer"
                                    >
                                      بله
                                    </button>
                                    <span className="text-slate-600">/</span>
                                    <button
                                      onClick={() => setDeleteConfirmActId(null)}
                                      className="text-slate-300 hover:underline text-[9px] cursor-pointer"
                                    >
                                      لغو
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-[9px] text-slate-400 font-mono">{act.scheduled_date}</span>
                                    <button
                                      onClick={() => handleDeleteActivity(act.id)}
                                      className="text-rose-500 hover:text-rose-400 p-0.5 cursor-pointer rounded"
                                      title="حذف فعالیت"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ADD NOTE BOX (افزودن یادداشت) */}
                <div className="bg-slate-900/20 rounded-xl border border-white/5 p-4.5 space-y-4 shadow.">
                  <div className="text-xs font-black text-slate-200 flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>افزودن یادداشت (Personal Insight Notes)</span>
                  </div>

                  <form onSubmit={handleAddNote} className="space-y-3">
                    <textarea
                      placeholder="یادداشتی ارسال کنید و برای اطلاع رسانی به @کاربر / @گروه / @همه به آنها اشاره کنید"
                      rows={2.5}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="w-full glass-input text-xs p-3 rounded-xl text-right bg-slate-950/50 border-white/5 focus:border-blue-500/30 text-slate-100 placeholder:text-slate-500 resize-none font-medium leading-relaxed"
                    />

                    <div className="flex items-center justify-between">
                      {/* Active open note switch toggle (visual rendering matching the screenshot 'باز کردن') */}
                      <div className="flex items-center gap-2 select-none">
                        <button
                          type="button"
                          onClick={() => setIsOpenNoteToggle(!isOpenNoteToggle)}
                          className={`w-10 h-5.5 rounded-full p-0.5 transition-colors focus:outline-none flex items-center cursor-pointer ${
                            isOpenNoteToggle ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
                          }`}
                        >
                          <div className="w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform" />
                        </button>
                        <span className="text-[10px] text-slate-400 font-semibold">باز کردن</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="submit"
                          disabled={!noteContent.trim()}
                          className="px-4.5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>ثبت یادداشت</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* List registered notes of this client */}
                  {notes.length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 block">یادداشت‌های ثبت شده پرونده:</span>
                      {notes.map((n) => {
                        const isPendingNoteDelete = deleteConfirmNoteId === n.id;
                        return (
                          <div key={n.id} className="p-2.5 bg-slate-950/40 rounded-xl border border-white/5 flex items-start justify-between gap-3 text-xs">
                            <div className="flex-1">
                              <p className="text-slate-200 mt-0.5 leading-relaxed">{n.content}</p>
                              <span className="text-[9px] text-slate-500 mt-1 block">توسط {n.author_name}</span>
                            </div>
                            <div className="shrink-0 flex items-center justify-end">
                              {isPendingNoteDelete ? (
                                <div className="flex items-center gap-1.5 text-[10px] bg-rose-950/55 border border-rose-500/40 px-2.5 py-1 rounded animate-fadeIn">
                                  <span className="text-rose-300 font-extrabold text-[9px]">حذف؟</span>
                                  <button
                                    onClick={() => {
                                      CRMDatabase.deleteNote(n.id);
                                      onChanged();
                                      setDeleteConfirmNoteId(null);
                                    }}
                                    className="text-rose-400 hover:underline font-extrabold text-[9px] cursor-pointer"
                                  >
                                    تایید
                                  </button>
                                  <span className="text-slate-600">/</span>
                                  <button
                                    onClick={() => setDeleteConfirmNoteId(null)}
                                    className="text-slate-350 hover:underline text-[9px] cursor-pointer"
                                  >
                                    لغو
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleDeleteNote(n.id)}
                                  className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Right side: Key Fields list container (فیلدهای کلیدی) */}
              <div className="lg:col-span-4 bg-slate-900/20 rounded-xl border border-white/5 p-4.5 space-y-4 animate-fadeIn">
                <div className="border-b border-white/5 pb-2.5 text-xs font-black text-slate-100 flex items-center gap-2">
                  <span className="p-1 px-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/15 text-[10px]">فیلد</span>
                  <span>فیلدهای کلیدی (Key Fields Hub)</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  
                  {/* Row 2: نام و نام خانوادگی (Full Name) */}
                  <div className="p-2.5 bg-slate-950/25 hover:bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-between relative group">
                    <div className="flex-1 flex items-center justify-start gap-1">
                      <span className="text-slate-400 font-semibold select-none w-28">نام و نام خانوادگی:</span>
                      {editingField === "full_name" ? (
                        <input
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("full_name")}
                          onBlur={() => saveInlineEdit("full_name")}
                          className="bg-slate-950 text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right text-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="text-slate-100 font-black">{lead.full_name || "—"}</span>
                      )}
                    </div>
                    <button 
                      onClick={() => startInlineEdit("full_name", lead.full_name)}
                      className="opacity-75 hover:opacity-100 text-slate-400 hover:text-emerald-500 p-0.5 cursor-pointer transition"
                      title="ویرایش نام و نام خانوادگی"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Row 3: شماره موبایل (Mobile) */}
                  <div className="p-2.5 bg-slate-950/25 hover:bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-between relative group">
                    <div className="flex-1 flex items-center justify-start gap-1">
                      <span className="text-slate-400 font-semibold select-none w-28">شماره موبایل:</span>
                      {editingField === "mobile" ? (
                        <input
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("mobile")}
                          onBlur={() => saveInlineEdit("mobile")}
                          className="bg-slate-950 text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-left font-mono text-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="text-blue-500 font-mono font-bold tracking-wide">{lead.mobile || "—"}</span>
                      )}
                    </div>
                    <button 
                      onClick={() => startInlineEdit("mobile", lead.mobile)}
                      className="opacity-75 hover:opacity-100 text-slate-400 hover:text-emerald-500 p-0.5 cursor-pointer transition"
                      title="ویرایش شماره همراه"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Row 4: شهر (City) */}
                  <div className="p-2.5 bg-slate-950/25 hover:bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-between relative group">
                    <div className="flex-1 flex items-center justify-start gap-1">
                      <span className="text-slate-400 font-semibold select-none w-28">شهر:</span>
                      {editingField === "city" ? (
                        <input
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("city")}
                          onBlur={() => saveInlineEdit("city")}
                          className="bg-slate-950 text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right text-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="text-slate-300 font-bold">{lead.city || "—"}</span>
                      )}
                    </div>
                    <button 
                      onClick={() => startInlineEdit("city", lead.city || "")}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Row 5: نوع مشاوره (Consultation Type repeated) */}
                  <div className="p-2.5 bg-slate-950/25 hover:bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-between relative group">
                    <div className="flex-1 flex items-center justify-start gap-1">
                      <span className="text-slate-400 font-semibold select-none w-28">نوع مشاوره:</span>
                      {editingField === "consultation_type" ? (
                        <input
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("consultation_type")}
                          onBlur={() => saveInlineEdit("consultation_type")}
                          className="bg-slate-950 text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right text-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="text-slate-300 font-bold">{lead.consultation_type || "—"}</span>
                      )}
                    </div>
                    <button 
                      onClick={() => startInlineEdit("consultation_type", lead.consultation_type || "")}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Row 6: درخواست/چالش */}
                  <div className="p-2.5 bg-slate-950/25 hover:bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-between relative group">
                    <div className="flex-1 flex flex-col justify-start items-start gap-1.5">
                      <span className="text-slate-400 font-semibold select-none">درخواست/چالش:</span>
                      {editingField === "request_challenge" ? (
                        <textarea
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onBlur={() => saveInlineEdit("request_challenge")}
                          className="bg-slate-950 text-slate-200 border border-emerald-500/30 rounded p-1 outline-none text-right text-xs w-full resize-none"
                          rows={2}
                          autoFocus
                        />
                      ) : (
                        <p className="text-slate-300 font-semibold leading-relaxed break-words">{lead.request_challenge || "—"}</p>
                      )}
                    </div>
                    <button 
                      onClick={() => startInlineEdit("request_challenge", lead.request_challenge)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition absolute left-2.5 top-2.5"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Row 7: شرکت (Company) */}
                  <div className="p-2.5 bg-slate-950/25 hover:bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-between relative group">
                    <div className="flex-1 flex items-center justify-start gap-1">
                      <span className="text-slate-400 font-semibold select-none w-28">شرکت:</span>
                      {editingField === "company" ? (
                        <input
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("company")}
                          onBlur={() => saveInlineEdit("company")}
                          className="bg-slate-950 text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right text-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="text-slate-300 font-bold">{lead.company || "—"}</span>
                      )}
                    </div>
                    <button 
                      onClick={() => startInlineEdit("company", lead.company || "")}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Row 8: آدرس (Address) */}
                  <div className="p-2.5 bg-slate-950/25 hover:bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-between relative group">
                    <div className="flex-1 flex items-center justify-start gap-1">
                      <span className="text-slate-400 font-semibold select-none w-28">آدرس:</span>
                      {editingField === "address" ? (
                        <input
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("address")}
                          onBlur={() => saveInlineEdit("address")}
                          className="bg-slate-950 text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right text-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="text-slate-300 font-bold text-slate-300 limit-lines-1">{lead.address || "—"}</span>
                      )}
                    </div>
                    <button 
                      onClick={() => startInlineEdit("address", lead.address || "")}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Opportunity Specific Fields */}
                  {lead.module_type === "opportunity" && (
                    <>
                      {/* Row 9: مشاور (Consultant) */}
                      <div className="p-2.5 bg-slate-950/25 hover:bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-between relative group">
                        <div className="flex-1 flex items-center justify-start gap-1">
                          <span className="text-slate-400 font-semibold select-none w-28">مشاور:</span>
                          {editingField === "consultant" ? (
                            <select
                              value={inlineEditValue}
                              onChange={(e) => setInlineEditValue(e.target.value)}
                              onBlur={() => saveInlineEdit("consultant")}
                              className="bg-slate-950 text-slate-250 border border-emerald-500/30 rounded p-0.5 outline-none text-right text-xs"
                              autoFocus
                            >
                              <option value="">انتخاب کنید...</option>
                              {consultantList.map((c) => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-300 font-bold">{getLabel(lead.consultant) || "—"}</span>
                          )}
                        </div>
                        <button 
                          onClick={() => startInlineEdit("consultant", lead.consultant || "")}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Row 10: مبلغ هزینه (Price) */}
                      <div className="p-2.5 bg-slate-950/25 hover:bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-between relative group">
                        <div className="flex-1 flex items-center justify-start gap-1">
                          <span className="text-slate-400 font-semibold select-none w-28">مبلغ هزینه (ریال):</span>
                          {editingField === "price" ? (
                            <input
                              type="number"
                              value={inlineEditValue}
                              onChange={(e) => setInlineEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveInlineEdit("price")}
                              onBlur={() => saveInlineEdit("price")}
                              className="bg-slate-950 text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right text-xs"
                              autoFocus
                            />
                          ) : (
                            <span className="text-slate-300 font-bold font-mono">
                              {lead.price ? Number(lead.price).toLocaleString("fa-IR") + " ریال" : "—"}
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => startInlineEdit("price", String(lead.price || ""))}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Row 11: نوع پرداخت (Payment Type) */}
                      <div className="p-2.5 bg-slate-950/25 hover:bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-between relative group">
                        <div className="flex-1 flex items-center justify-start gap-1">
                          <span className="text-slate-400 font-semibold select-none w-28">نوع پرداخت:</span>
                          {editingField === "payment_type" ? (
                            <select
                              value={inlineEditValue}
                              onChange={(e) => setInlineEditValue(e.target.value)}
                              onBlur={() => saveInlineEdit("payment_type")}
                              className="bg-slate-950 text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right text-xs cursor-pointer"
                              autoFocus
                            >
                              <option value="">انتخاب کنید...</option>
                              {paymentTypeList.map((pt) => (
                                <option key={pt.id} value={pt.id}>{pt.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-300 font-bold">{getLabel(lead.payment_type) || "—"}</span>
                          )}
                        </div>
                        <button 
                          onClick={() => startInlineEdit("payment_type", lead.payment_type || "")}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Row 12: روش پرداخت (Payment Method) */}
                      <div className="p-2.5 bg-slate-950/25 hover:bg-slate-950/50 rounded-xl border border-white/5 flex items-center justify-between relative group">
                        <div className="flex-1 flex items-center justify-start gap-1">
                          <span className="text-slate-400 font-semibold select-none w-28">روش پرداخت:</span>
                          {editingField === "payment_method" ? (
                            <select
                              value={inlineEditValue}
                              onChange={(e) => setInlineEditValue(e.target.value)}
                              onBlur={() => saveInlineEdit("payment_method")}
                              className="bg-slate-950 text-slate-200 border border-emerald-500/30 rounded p-0.5 outline-none text-right text-xs cursor-pointer"
                              autoFocus
                            >
                              <option value="">انتخاب کنید...</option>
                              {paymentMethodList.map((pm) => (
                                <option key={pm.id} value={pm.id}>{pm.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-300 font-bold">{getLabel(lead.payment_method) || "—"}</span>
                          )}
                        </div>
                        <button 
                          onClick={() => startInlineEdit("payment_method", lead.payment_method || "")}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-emerald-400 p-0.5 cursor-pointer transition"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}

                </div>
              </div>

            </div>
          </>
        ) : activeSidebarTab === "notes" ? (
          /* Personal notes screen placeholder or real system logs */
          <div className="bg-slate-900/20 rounded-xl border border-white/5 p-6 space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-slate-100">بخش اختصاصی یادداشت‌ها</h3>
            <p className="text-xs text-slate-400">تمام خلاصه مذاکرات و یادداشت‌های ثبت شده در این زبانه قابل دسترسی است.</p>
            <div className="space-y-4">
              {notes.map((n) => (
                <div key={n.id} className="p-3 bg-slate-950/50 rounded-lg border border-white/5 text-xs text-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-400">{n.author_name}</span>
                    <span className="text-[10px] text-slate-500">{new Date(n.created_at).toLocaleDateString("fa-IR")}</span>
                  </div>
                  <p>{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        ) : activeSidebarTab === "activities" ? (
          /* Scheduled activities tab screen */
          <div className="bg-slate-900/20 rounded-xl border border-white/5 p-6 space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-slate-100">فعالیت‌ها و برنامه‌ریزی‌ها</h3>
            <p className="text-xs text-slate-400">برنامه‌های تماس و جلسات کاری تنظیم شده با این کلاینت:</p>
            <div className="space-y-3">
              {activities.map((act) => (
                <div key={act.id} className="p-3 bg-slate-950/50 rounded-lg border border-white/5 flex items-center justify-between text-xs text-slate-200">
                  <div>
                    <p className="font-bold">{act.title}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">زمان: {act.scheduled_date} {act.scheduled_time}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">{act.priority === "high" ? "اولویت بالا" : "متوسط"}</span>
                </div>
              ))}
            </div>
          </div>
        ) : activeSidebarTab === "updates" ? (
          /* Logs / updates history screen representing activity changes */
          <div className="bg-slate-900/20 rounded-xl border border-white/5 p-6 space-y-4 animate-fadeIn text-right">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin-slow" />
                <span>بروزرسانی‌ها و تاریخچه تغییرات (Updates Log)</span>
              </h3>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                {auditLogs.length} ثبت شده
              </span>
            </div>
            
            <p className="text-xs text-slate-400">تاریخچه کامل تغییرات فیلدها و ثبت اقدامات صورت گرفته روی این پرونده توسط اعضای تیم:</p>
            
            <div className="space-y-3.5 relative border-r border-white/5 pr-4 mr-2">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  هیچ بروزرسانی یا تغییر ثبت‌شده‌ای برای این پرونده وجود ندارد.
                </div>
              ) : (
                [...auditLogs].reverse().map((log) => (
                  <div key={log.id} className="relative group p-3 bg-slate-950/30 hover:bg-slate-950/60 rounded-xl border border-white/5 transition duration-150">
                    {/* Circle icon on timeline bar */}
                    <div className="absolute right-[-21px] top-4 w-2 h-2 rounded-full bg-emerald-500 border border-slate-900 shadow-md group-hover:scale-125 transition" />
                    
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 border-b border-white/5 pb-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-300">{log.changed_by_name}</span>
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded">({log.changed_by_role})</span>
                      </div>
                      <span className="font-mono text-[9px] text-slate-500">{formatPersianDate(log.created_at)}</span>
                    </div>

                    <div className="text-xs text-slate-200">
                      {log.change_type === "convert" ? (
                        <p className="font-bold text-emerald-400">
                          تبدیل پرونده از سرنخ فروش به فرصت تجاری با موفقیت انجام شد.
                        </p>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5 leading-relaxed text-right">
                          <span>فیلد</span>
                          <strong className="text-cyan-400 font-extrabold">«{log.field_name}»</strong>
                          <span>از مقدار</span>
                          <span className="text-slate-400 line-through bg-slate-950/50 px-1.5 py-0.5 rounded font-mono text-[10px] break-all">{log.old_value || "—"}</span>
                          <span>به</span>
                          <span className="text-emerald-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded font-mono text-[10px] break-all">{log.new_value || "—"}</span>
                          <span>تغییر یافت.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Mock other screens inside ERP for visual completeness and richness */
          <div className="bg-slate-900/20 rounded-xl border border-white/5 p-12 text-center space-y-3 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-slate-950/50 text-blue-400/30 border border-white/5 flex items-center justify-center mx-auto mb-2">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-black text-slate-200">داده‌ای یافت نشد ({sidebarItems.find(o => o.id === activeSidebarTab)?.label})</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              این بخش در حال حاضر برای مشتری پرونده فعلی فاقد رکورد عملیاتی ثبت شده است. به کمک فیلدهای کلیدی یا خلاصه وضعیت اقدام به عارضه‌یابی و ورود اطلاعات کنید.
            </p>
          </div>
        )}

      </div>

      {/* 2. Side navigation menu on the Right (Takes up layout column, solid background) */}
      <div className="w-full lg:w-64 bg-slate-900 border-r lg:border-r-0 lg:border-l border-slate-700 flex flex-col pt-4 shrink-0" id="erp-right-sidebar">
        {/* Title / Module Indicator */}
        <div className="px-5 pb-4 border-b border-slate-700 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400 animate-pulse" />
          <span className="text-xs font-black text-slate-100">پروفایل جامع لید فرانت-اند</span>
        </div>

        {/* Sidebar Nav links list */}
        <nav className="flex-1 p-2 space-y-1.5 overflow-y-auto mt-4" id="sidebar-tabs-navigation">
          {sidebarItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSidebarTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSidebarTab(item.id)}
                className={`w-full text-right p-3 rounded-xl text-xs font-black flex items-center justify-between cursor-pointer transition ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/10 border border-emerald-500/25"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {/* Active side indicator */}
                {isActive && (
                  <div className="w-1.5 h-4 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Brand identity */}
        <div className="p-4 border-t border-slate-700 bg-slate-950/20 text-center select-none">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider">یکپارچه‌سازی فرآیند فروش CRM</span>
        </div>
      </div>

      {/* Convert to Opportunity Modal Overlay */}
      {showConvertForm && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" id="convert-lead-popup-overlay">
          <div className="bg-slate-900 border border-slate-750 max-w-sm w-full p-6 pb-5 rounded-2xl shadow-2xl text-right space-y-4" id="convert-lead-popup-card">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              <h3 className="text-xs font-black text-slate-100">تبدیل سرنخ به فرصت فروش</h3>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              با تبدیل سرنخ <strong className="text-slate-200">«{lead.full_name}»</strong> به فرصت، مشخصات کلیدی مالی و فرآیند معامله آن در سیستم فعال خواهد شد.
            </p>

            <form onSubmit={handleConfirmConvert} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">وضعیت فرصت را مشخص کنید *</label>
                <select
                  value={selectedOppStatus}
                  onChange={(e) => setSelectedOppStatus(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-slate-950 text-slate-200 border border-white/10 cursor-pointer outline-none"
                  required
                >
                  <option value="">انتخاب کنید...</option>
                  {oppStatusList.map((st) => (
                    <option key={st.id} value={st.id}>{st.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">مبلغ برآوردی / هزینه معامله (ریال) *</label>
                <input
                  type="number"
                  value={dealPrice}
                  onChange={(e) => setDealPrice(e.target.value)}
                  placeholder="مثال: ۵۰۰۰۰۰۰۰"
                  className="w-full text-xs p-2 rounded-lg bg-slate-950 text-slate-200 border border-white/10 outline-none"
                  required
                  min="0"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowConvertForm(false)}
                  className="px-3.5 py-2 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer transition flex items-center gap-1.5 shadow"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>تایید تبدیل به فرصت</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
