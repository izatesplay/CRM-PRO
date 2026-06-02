/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Lead, DropdownOption, User } from "../types";
import { CRMDatabase } from "../utils/db";
import { X, Check, Save, Sparkles, MessageSquare, User as UserIcon, Users, Layers, Activity, Briefcase, Coins, FileText } from "lucide-react";

interface LeadModalProps {
  lead?: Lead | null; // If provided, we are editing, otherwise creating
  moduleType: "lead" | "opportunity";
  activeUser: User;
  onClose: () => void;
  onSave: () => void;
}

export default function LeadModal({ lead, moduleType, activeUser, onClose, onSave }: LeadModalProps) {
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [referral, setReferral] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [service, setService] = useState("");
  const [subService, setSubService] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [requestChallenge, setRequestChallenge] = useState("");
  const [smsText, setSmsText] = useState("");

  // Opportunity fields
  const [opportunityStatus, setOpportunityStatus] = useState("");
  const [consultant, setConsultant] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [paymentType, setPaymentType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const [errorMsg, setErrorMsg] = useState("");

  // Dynamic & customized fields states
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const disabledSystemFields = CRMDatabase.getDisabledSystemFields();
  const customFieldsDef = CRMDatabase.getCustomFields().filter(f => f.enabled);

  // Retrieve dropdown arrays for form select boxes
  const dropdowns = CRMDatabase.getDropdowns();
  const referralList = dropdowns.filter((o) => o.category === "referral");
  const sourceList = dropdowns.filter((o) => o.category === "lead_source");
  const serviceList = dropdowns.filter((o) => o.category === "service");
  const statusList = dropdowns.filter((o) => o.category === "lead_status");

  // Opportunity dropdowns
  const oppStatusList = dropdowns.filter((o) => o.category === "opportunity_status");
  const consultantList = dropdowns.filter((o) => o.category === "consultant");
  const paymentTypeList = dropdowns.filter((o) => o.category === "payment_type");
  const paymentMethodList = dropdowns.filter((o) => o.category === "payment_method");

  // Filter sub services depending on selected parent service!
  const filteredSubServices = dropdowns.filter(
    (o) => o.category === "sub_service" && o.parent_id === service
  );

  // If a user selects a service, and their previous subService is not in the filtered list, clear it!
  useEffect(() => {
    if (service) {
      const isValid = filteredSubServices.some((s) => s.id === subService);
      if (!isValid) {
        setSubService(""); // Clear stale subcategory
      }
    } else {
      setSubService("");
    }
  }, [service]);

  // Load existing lead details if editing
  useEffect(() => {
    // Populate dynamic custom fields first
    const initialCustomVals: Record<string, any> = {};
    customFieldsDef.forEach((field) => {
      initialCustomVals[field.key] = lead ? (lead[field.key] ?? "") : "";
    });
    setCustomFieldValues(initialCustomVals);

    if (lead) {
      setFullName(lead.full_name || "");
      setMobile(lead.mobile || "");
      setReferral(lead.referral || "");
      setLeadSource(lead.lead_source || "");
      setService(lead.service || "");
      setSubService(lead.sub_service || "");
      setLeadStatus(lead.lead_status || "");
      setRequestChallenge(lead.request_challenge || "");
      setSmsText(lead.sms_text || "");

      if (lead.module_type === "opportunity") {
        setOpportunityStatus(lead.opportunity_status || "");
        setConsultant(lead.consultant || "");
        setPrice(lead.price !== undefined ? lead.price : "");
        setPaymentType(lead.payment_type || "");
        setPaymentMethod(lead.payment_method || "");
      }
    } else {
      // Set default statuses if creating
      if (statusList.length > 0) setLeadStatus(statusList[0].id);
      if (oppStatusList.length > 0) setOpportunityStatus(oppStatusList[0].id);
    }
  }, [lead]);

  // Quick helper to write SMS templates based on client's service & details
  const handleAutoGenerateSMS = () => {
    if (!fullName) {
      setErrorMsg("ابتدا نام مشتری را وارد کنید تا پیامک شخصی‌سازی شده آماده شود.");
      return;
    }
    const currentService = serviceList.find(s => s.id === service)?.label || "سرویس انتخابی";
    setSmsText(
      `جناب ${fullName} گرامی، ارائه‌ خدمات "${currentService}" شما در مرحله پیگیری و اولویت ویژه قرار گرفت. مشاوران ما به زودی با شماره ${mobile || "شما"} تماس حاصل خواهند فرمود.`
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim()) {
      setErrorMsg("نام و نام خانوادگی مشتری الزامی است.");
      return;
    }

    if (mobile && !/^09[0-9]{9}$/.test(mobile.trim())) {
      setErrorMsg("فرمت شماره همراه اشتباه است (نمونه صحیح: 09123456789)");
      return;
    }

    const payload: Partial<Lead> = {
      full_name: fullName.trim(),
      mobile: mobile.trim(),
      referral,
      lead_source: leadSource,
      service,
      sub_service: subService,
      lead_status: leadStatus,
      request_challenge: requestChallenge.trim(),
      sms_text: smsText.trim(),
      module_type: moduleType,
      ...customFieldValues, // Merge dynamic custom fields values
    };

    if (moduleType === "opportunity") {
      payload.opportunity_status = opportunityStatus;
      payload.consultant = consultant;
      payload.price = price !== "" ? Number(price) : undefined;
      payload.payment_type = paymentType;
      payload.payment_method = paymentMethod;
    }

    try {
      if (lead) {
        CRMDatabase.updateLead(lead.id, payload, activeUser);
      } else {
        CRMDatabase.addLead(payload as Omit<Lead, "id" | "created_at">, activeUser);
      }
      onSave();
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || "خطایی در ذخیره اطلاعات رخ داد.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl glass-panel-heavy rounded-2xl border border-white/10 shadow-2xl overflow-hidden my-8" id="lead-editor-modal">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between text-right bg-slate-900/40">
          <div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-2 ${
              moduleType === "opportunity"
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
              {moduleType === "opportunity" ? "فرصت فروش مجلل" : "سرنخ فروش خام"}
            </span>
            <h2 className="text-base font-bold text-slate-100 inline">
              {lead ? `ویرایش پرونده مشتری: ${lead.full_name}` : `افزودن ${moduleType === "opportunity" ? "فرصت فروش" : "سرنخ"} جدید سیستمی`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition overflow-visible cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="m-5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl text-right">
            ⚠️ <strong>خطا در بررسی:</strong> {errorMsg}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="p-6 space-y-6">
          {/* Main sections block - Restructured into Logically Grouped Containers */}
          <div className="space-y-5 text-right">
            
            {/* Section 1: Contact Information (اطلاعات هویتی و تماس مشتری) */}
            <div className="bg-slate-900/40 p-4.5 rounded-xl border border-white/5 space-y-4 animate-fadeIn">
              <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2 border-b border-white/5 pb-2.5">
                <span className="p-1 px-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/15">
                  <UserIcon className="w-3.5 h-3.5" />
                </span>
                <span>اطلاعات تماس و هویت مشتری (Contact Information)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">نام و نام خانوادگی مشتری *</label>
                  <input
                    type="text"
                    placeholder="مثال: جناب هومن کاظمی"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full glass-input text-xs p-2.5 rounded-xl text-right bg-slate-950/50 border-white/5 focus:border-emerald-500/30"
                    id="modal-fullname-input"
                  />
                </div>

                {!disabledSystemFields.includes("mobile") && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">شماره تلفن همراه (موبایل)</label>
                    <input
                      type="text"
                      placeholder="09121234567"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full glass-input text-xs p-2.5 rounded-xl font-mono text-left tracking-wide bg-slate-950/50 border-white/5 focus:border-emerald-500/30"
                      id="modal-mobile-input"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Attribution Details (کانال جذب و انتساب پرونده) */}
            {(!disabledSystemFields.includes("referral") || !disabledSystemFields.includes("lead_source")) && (
              <div className="bg-slate-900/40 p-4.5 rounded-xl border border-white/5 space-y-4 animate-fadeIn">
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2 border-b border-white/5 pb-2.5">
                  <span className="p-1 px-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/15">
                    <Users className="w-3.5 h-3.5" />
                  </span>
                  <span>ارجاع پرونده و کانال‌های بازاریابی (Assignment & Source)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!disabledSystemFields.includes("referral") && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">ارجاع و تخصیص به</label>
                      <select
                        value={referral}
                        onChange={(e) => setReferral(e.target.value)}
                        className="w-full glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer border-white/5 focus:border-emerald-500/30"
                        id="modal-referral-select"
                      >
                        <option value="">-- انتخاب پرسنل --</option>
                        {referralList.map((rf) => (
                          <option key={rf.id} value={rf.id}>
                            {rf.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!disabledSystemFields.includes("lead_source") && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">کانال جذب / منبع سرنخ</label>
                      <select
                        value={leadSource}
                        onChange={(e) => setLeadSource(e.target.value)}
                        className="w-full glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer border-white/5 focus:border-emerald-500/30"
                        id="modal-source-select"
                      >
                        <option value="">-- انتخاب کانال بازاریابی --</option>
                        {sourceList.map((src) => (
                          <option key={src.id} value={src.id}>
                            {src.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 3: Service Selection (خدمات و دسته‌بندی موضوعی) */}
            {!disabledSystemFields.includes("service") && (
              <div className="bg-slate-900/40 p-4.5 rounded-xl border border-white/5 space-y-4 animate-fadeIn">
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2 border-b border-white/5 pb-2.5">
                  <span className="p-1 px-1.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/15">
                    <Layers className="w-3.5 h-3.5" />
                  </span>
                  <span>سرویس درخواستی و طبقه‌بندی تخصصی (Requested Service & Categories)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">سرویس پیشنهادی والد</label>
                    <select
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer border-white/5 focus:border-emerald-500/30"
                      id="modal-service-select"
                    >
                      <option value="">-- انتخاب سرویس والد اصلی --</option>
                      {serviceList.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">زیرمنوی سرویس تخصصی</label>
                    <select
                      value={subService}
                      onChange={(e) => setSubService(e.target.value)}
                      disabled={!service}
                      className="w-full glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer disabled:opacity-40 border-white/5 focus:border-emerald-500/30"
                      id="modal-subservice-select"
                    >
                      <option value="">-- ابتدا سرویس بالا را مشخص کنید --</option>
                      {filteredSubServices.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Section 4: System Status & Inquiry (وضعیت ارتباطی سیستم و عارضه‌یابی) */}
            {(!disabledSystemFields.includes("lead_status") || !disabledSystemFields.includes("request_challenge")) && (
              <div className="bg-slate-900/40 p-4.5 rounded-xl border border-white/5 space-y-4 animate-fadeIn">
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2 border-b border-white/5 pb-2.5">
                  <span className="p-1 px-1.5 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/15">
                    <Activity className="w-3.5 h-3.5" />
                  </span>
                  <span>وضعیت ارتباط سرنخ و عارضه‌یابی (System Status & Challenge Inquiry)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!disabledSystemFields.includes("lead_status") && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">وضعیت ارتباط سرنخ</label>
                      <select
                        value={leadStatus}
                        onChange={(e) => setLeadStatus(e.target.value)}
                        className="w-full glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer border-white/5 focus:border-emerald-500/30"
                        id="modal-status-select"
                      >
                        {statusList.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!disabledSystemFields.includes("lead_status") && <div className="hidden md:block" />}

                  {!disabledSystemFields.includes("request_challenge") && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>شرح عارضه / چالش اصلی مشتری و درخواست</span>
                      </label>
                      <textarea
                        placeholder="توضیحات مفصل در خصوص چالش تجاری و درخواستی..."
                        rows={2}
                        value={requestChallenge}
                        onChange={(e) => setRequestChallenge(e.target.value)}
                        className="w-full glass-input text-xs p-2.5 rounded-xl text-right resize-none bg-slate-950/50 border-white/5 focus:border-emerald-500/30"
                        id="modal-challenge-textarea"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 5: Custom Dynamic Fields Section */}
            {customFieldsDef.length > 0 && (
              <div className="bg-slate-900/40 p-4.5 rounded-xl border border-white/5 space-y-4 animate-fadeIn">
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2 border-b border-white/5 pb-2.5">
                  <span className="p-1 px-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/15">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <span>اطلاعات تکمیلی و سفارشی (Custom & Dynamic Fields)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFieldsDef.map((field) => (
                    <div key={field.id}>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {field.label}
                      </label>
                      {field.type === "boolean" ? (
                        <select
                          value={customFieldValues[field.key] ?? ""}
                          onChange={(e) => setCustomFieldValues(prev => ({
                            ...prev,
                            [field.key]: e.target.value === "true" ? true : e.target.value === "false" ? false : ""
                          }))}
                          className="w-full glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer border-white/5 focus:border-indigo-500/30"
                        >
                          <option value="">-- انتخاب کنید --</option>
                          <option value="true">بله</option>
                          <option value="false">خیر</option>
                        </select>
                      ) : field.type === "number" ? (
                        <input
                          type="number"
                          value={customFieldValues[field.key] ?? ""}
                          onChange={(e) => setCustomFieldValues(prev => ({
                            ...prev,
                            [field.key]: e.target.value !== "" ? Number(e.target.value) : ""
                          }))}
                          className="w-full glass-input text-xs p-2.5 rounded-xl text-left font-mono bg-slate-950/50 border-white/5 focus:border-indigo-500/30"
                          placeholder={`${field.label}...`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={customFieldValues[field.key] ?? ""}
                          onChange={(e) => setCustomFieldValues(prev => ({
                            ...prev,
                            [field.key]: e.target.value
                          }))}
                          className="w-full glass-input text-xs p-2.5 rounded-xl text-right bg-slate-950/50 border-white/5 focus:border-indigo-500/30"
                          placeholder={`مقدار فیلد ${field.label}...`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Opportunity Specific Fields (Separated styling with Header and Icon) */}
          {moduleType === "opportunity" && (
            <div className="bg-slate-900/40 p-4.5 rounded-xl border border-cyan-500/15 space-y-4 animate-fadeIn">
              <h3 className="text-xs font-bold text-cyan-400 flex items-center gap-2 border-b border-cyan-500/15 pb-2.5">
                <span className="p-1 px-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/15">
                  <Briefcase className="w-3.5 h-3.5" />
                </span>
                <span>جزئیات تفاهم‌نامه و معامله پیش‌فاکتور (Opportunity Details & Pricing)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">وضعیت پیشرفت فرصت</label>
                  <select
                    value={opportunityStatus}
                    onChange={(e) => setOpportunityStatus(e.target.value)}
                    className="w-full glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer border-white/5 focus:border-cyan-500/30"
                    id="modal-oppstatus-select"
                  >
                    {oppStatusList.map((opp) => (
                      <option key={opp.id} value={opp.id}>
                        {opp.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">مشاور مسئول پرونده</label>
                  <select
                    value={consultant}
                    onChange={(e) => setConsultant(e.target.value)}
                    className="w-full glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer border-white/5 focus:border-cyan-500/30"
                    id="modal-consultant-select"
                  >
                    <option value="">-- انتخاب مشاور --</option>
                    {consultantList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-cyan-400" />
                    <span>مبلغ برآورد معامله مالی (تومان)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="مبلغ به تومان..."
                    value={price}
                    onChange={(e) => setPrice(e.target.value !== "" ? Number(e.target.value) : "")}
                    className="w-full glass-input text-xs p-2.5 rounded-xl text-left font-mono bg-slate-950/50 border-white/5 focus:border-cyan-500/30"
                    id="modal-price-input"
                  />
                  {price !== "" && (
                    <span className="text-[10px] text-cyan-400 mt-1 block">
                      معادل: {Number(price).toLocaleString("fa-IR")} تومان
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-right">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">شرایط پرداخت</label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="w-full glass-input text-[11px] p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer border-white/5 focus:border-cyan-500/30"
                      id="modal-paytype-select"
                    >
                      <option value="">نوع پرداخت...</option>
                      {paymentTypeList.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">روش تسویه کشویی</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full glass-input text-[11px] p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer border-white/5 focus:border-cyan-500/30"
                      id="modal-paymethod-select"
                    >
                      <option value="">متد تسویه...</option>
                      {paymentMethodList.map((pm) => (
                        <option key={pm.id} value={pm.id}>
                          {pm.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SMS Notification Template */}
          {!disabledSystemFields.includes("sms_text") && (
            <div className="p-4 bg-slate-900/20 rounded-xl border border-white/5 text-right space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">متن پیامک پیش‌نویس (ارسال خودکار)</span>
                <button
                  type="button"
                  onClick={handleAutoGenerateSMS}
                  className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>نگارش خودکار با الگو</span>
                </button>
              </div>
              <textarea
                placeholder="متن پیامک جهت هماهنگی، خیرمقدم یا ارسال پیش‌فاکتور..."
                rows={2}
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                className="w-full glass-input text-xs p-2.5 rounded-xl text-right resize-none"
                id="modal-smstext-textarea"
              />
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-white/5 pt-4 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="glass-btn-secondary text-xs px-4 py-2.5 rounded-xl text-slate-300 cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="glass-btn-primary text-xs px-5 py-2.5 rounded-xl text-white font-semibold flex items-center gap-1.5 cursor-pointer"
              id="modal-save-btn"
            >
              <Save className="w-4 h-4" />
              <span>{lead ? "ویرایش نهایی پرونده" : "ثبت و راه‌اندازی پرونده جدید"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
