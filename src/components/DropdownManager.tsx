/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { DropdownCategory, DropdownOption, CATEGORY_LABELS } from "../types";
import { CRMDatabase } from "../utils/db";
import { Plus, Trash2, Edit2, Check, X, ShieldAlert, Palette, Layers } from "lucide-react";

interface DropdownManagerProps {
  onChanged: () => void;
}

const HEX_PRESETS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#6366f1", // Indigo
  "#a855f7", // Purple
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#f43f5e", // Rose
  "#eab308", // Yellow
  "#6b7280", // Gray
];

export default function DropdownManager({ onChanged }: DropdownManagerProps) {
  const [activeCategory, setActiveCategory] = useState<string>("lead_status");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(HEX_PRESETS[0]);
  const [parentId, setParentId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editParentId, setEditParentId] = useState("");

  const customDropdownFields = CRMDatabase.getCustomFields().filter(f => f.enabled && f.type === "dropdown");
  const mergedCategoryLabels: Record<string, string> = {
    ...CATEGORY_LABELS,
  };
  customDropdownFields.forEach(f => {
    mergedCategoryLabels[f.key] = `${f.label} (سفارشی)`;
  });

  // In-place click confirmation state to bypass blocked dialogs in preview
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Mapped configuration options for sales volume calculation formulas
  const [salesPriceField, setSalesPriceField] = useState<string>(() => {
    return localStorage.getItem("crm_sales_price_field") || "price";
  });
  const [salesWonStatus, setSalesWonStatus] = useState<string>(() => {
    return localStorage.getItem("crm_sales_won_status") || "ost_4";
  });
  const [saveStatusSuccess, setSaveStatusSuccess] = useState(false);

  const dropdowns = CRMDatabase.getDropdowns();
  const currentOptions = dropdowns.filter((o) => o.category === activeCategory)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Filter possible parent service options (only from "service" category)
  const serviceOptions = dropdowns.filter((o) => o.category === "service");
  const opportunityStatusOptions = dropdowns.filter((o) => o.category === "opportunity_status");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    CRMDatabase.addDropdown({
      category: activeCategory,
      label: label.trim(),
      color,
      sort_order: currentOptions.length + 1,
      parent_id: activeCategory === "sub_service" ? parentId || undefined : undefined,
    });

    setLabel("");
    setParentId("");
    onChanged();
  };

  const handleStartEdit = (opt: DropdownOption) => {
    setEditingId(opt.id);
    setEditLabel(opt.label);
    setEditColor(opt.color);
    setEditParentId(opt.parent_id || "");
  };

  const handleSaveEdit = (id: string) => {
    if (!editLabel.trim()) return;
    CRMDatabase.updateDropdown(id, {
      label: editLabel.trim(),
      color: editColor,
      parent_id: activeCategory === "sub_service" ? editParentId || undefined : undefined,
    });
    setEditingId(null);
    onChanged();
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleSaveSalesConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("crm_sales_price_field", salesPriceField);
    localStorage.setItem("crm_sales_won_status", salesWonStatus);
    setSaveStatusSuccess(true);
    onChanged();
    setTimeout(() => setSaveStatusSuccess(false), 2500);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl text-right" id="dropdown-manager">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">مدیریت اطلاعات و مقادیر پایه کلیدی</h2>
          <p className="text-xs text-slate-400">گزینه‌های لیست‌های کشویی و خدمات سازمانی را سفارشی‌سازی کنید</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category selector column */}
        <div className="lg:col-span-1 flex flex-col gap-1.5 border-l border-white/5 pl-2">
          <label className="text-xs text-slate-400 mb-2 font-medium">سرفصل اطلاعات پایه</label>
          {Object.keys(mergedCategoryLabels).map((cat) => {
            const count = dropdowns.filter((o) => o.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setEditingId(null);
                  setLabel("");
                }}
                className={`p-3 rounded-xl text-xs font-semibold text-right transition-all cursor-pointer flex items-center justify-between ${
                  activeCategory === cat
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-white/0 text-slate-300 hover:bg-white/5"
                }`}
                id={`cat-selector-${cat}`}
              >
                <span>{mergedCategoryLabels[cat]}</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full border border-white/5">
                  {count}
                </span>
              </button>
            );
          })}

          {/* Admin Sales calculation configuration */}
          <div className="mt-6 p-4 bg-slate-900/40 rounded-2xl border border-white/5 space-y-4 text-right">
            <h3 className="text-xs font-black text-amber-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>پیکربندی هوشمند فروش کل</span>
            </h3>
            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
              تعیین مراجع اتوماتیک محاسبه گر جمع کل فروش هر کارشناس:
            </p>
            <form onSubmit={handleSaveSalesConfig} className="space-y-3">
              <div>
                <label className="block text-[9px] text-slate-400 mb-1 font-semibold">فیلد مأخذ قیمت معامله</label>
                <select
                  value={salesPriceField}
                  onChange={(e) => setSalesPriceField(e.target.value)}
                  className="w-full text-right bg-slate-950 border border-white/5 p-2 rounded-lg text-[10px] text-slate-200 cursor-pointer focus:border-amber-500/30 font-medium"
                >
                  <option value="price">ارزش مالی پیش‌فرض (Price)</option>
                  <option value="pre_price">ارزش فرضی اولیه (Pre-Price)</option>
                  <option value="actual_margin">سود قطعی معامله (Margin)</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 mb-1 font-semibold font-mono">وضعیت نهایی معامله موفق (Won)</label>
                <select
                  value={salesWonStatus}
                  onChange={(e) => setSalesWonStatus(e.target.value)}
                  className="w-full text-right bg-slate-950 border border-white/5 p-2 rounded-lg text-[10px] text-slate-200 cursor-pointer focus:border-amber-500/30 font-medium"
                >
                  {opportunityStatusOptions.map((os) => (
                    <option key={os.id} value={os.id}>
                      {os.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-lg text-[10px] transition cursor-pointer shadow-lg shadow-amber-500/5 hover:scale-[1.01]"
              >
                ذخیره مرجع محاسباتی
              </button>

              {saveStatusSuccess && (
                <p className="text-[9px] text-teal-400 font-bold text-center animate-fadeIn">
                  ✓ مراجع با موفقیت تغییر داده شد.
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Selected Category Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Form to add item */}
          <form onSubmit={handleAdd} className="p-4 bg-slate-900/30 rounded-xl border border-white/5 space-y-4" id="add-dropdown-form">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>افزودن گزینه جدید به لیست " {mergedCategoryLabels[activeCategory]} "</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1.5">نام گزینه (فارسی) *</label>
                <input
                  type="text"
                  placeholder="مثال: کمپین یلدا"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full glass-input text-xs p-2.5 rounded-xl text-right"
                  id="add-label-input"
                />
              </div>

              {activeCategory === "sub_service" && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1.5">انتخاب سرویس والد ارتباطی *</label>
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full glass-input text-xs p-2.5 rounded-xl text-right bg-slate-900 cursor-pointer"
                    id="add-parent-select"
                  >
                    <option value="">-- سرویس والد را انتخاب کنید --</option>
                    {serviceOptions.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={activeCategory === "sub_service" ? "sm:col-span-2" : ""}>
                <label className="block text-[11px] text-slate-400 mb-1.5">انتخاب شناسه رنگی آیتم</label>
                <div className="flex flex-wrap gap-2 items-center">
                  <div
                    className="w-8 h-8 rounded-lg shrink-0 border border-white/10 shadow-inner"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex flex-wrap gap-1.5 max-w-md">
                    {HEX_PRESETS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setColor(hex)}
                        className={`w-6 h-6 rounded-full border transition cursor-pointer hover:scale-110 ${
                          color === hex ? "border-white scale-105" : "border-white/5"
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  {/* Custom color input */}
                  <div className="relative flex items-center pr-2 mr-2 border-r border-white/10">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                    <Palette className="w-4 h-4 absolute pointer-events-none left-2 text-slate-300" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!label.trim() || (activeCategory === "sub_service" && !parentId)}
                className="glass-btn-primary text-xs px-4 py-2 rounded-lg text-white font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                id="add-dropdown-btn"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت گزینه جدید</span>
              </button>
            </div>
          </form>

          {/* Table List of options */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400">گزینه‌های فعلی موجود ({currentOptions.length} آیتم)</h4>
            
            {currentOptions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/10 rounded-xl border border-white/5">
                هیچ گزینه‌ای در این دسته هنوز تعریف نشده است.
              </div>
            ) : (
              <div className="divide-y divide-white/5 space-y-1">
                {currentOptions.map((opt) => {
                  const isEditing = editingId === opt.id;
                  const parentName = opt.parent_id
                    ? serviceOptions.find((s) => s.id === opt.parent_id)?.label
                    : null;

                  return (
                    <div
                      key={opt.id}
                      className="p-3 bg-slate-900/20 hover:bg-slate-900/40 border border-white/5 rounded-xl flex items-center justify-between gap-4 transition-all"
                    >
                      {isEditing ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 text-right">
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="glass-input text-xs p-2 rounded-lg text-right"
                          />
                          {activeCategory === "sub_service" ? (
                            <select
                              value={editParentId}
                              onChange={(e) => setEditParentId(e.target.value)}
                              className="glass-input text-xs p-2 rounded-lg bg-slate-900"
                            >
                              <option value="">سرویس والد...</option>
                              {serviceOptions.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div />
                          )}
                          <div className="flex items-center gap-2 pr-2">
                            <input
                              type="color"
                              value={editColor}
                              onChange={(e) => setEditColor(e.target.value)}
                              className="w-7 h-7 rounded bg-transparent border-0"
                            />
                            <span className="text-[10px] text-slate-400 font-mono">{editColor}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-white/10"
                            style={{ backgroundColor: opt.color }}
                          />
                          <div>
                            <span className="text-xs font-semibold text-slate-200">{opt.label}</span>
                            {parentName && (
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5 rounded mr-2 border border-emerald-500/20 font-medium">
                                والد: {parentName}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(opt.id)}
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg cursor-pointer"
                              title="ذخیره"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                              title="انصراف"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {deleteConfirmId === opt.id ? (
                              <div className="flex items-center gap-1 text-[10px] bg-rose-950/40 border border-rose-500/25 px-2.5 py-1 rounded-lg animate-fadeIn text-slate-200" dir="rtl">
                                <span>حذف؟</span>
                                <button
                                  onClick={() => {
                                    CRMDatabase.deleteDropdown(opt.id);
                                    onChanged();
                                    setDeleteConfirmId(null);
                                  }}
                                  className="text-rose-400 hover:underline font-extrabold cursor-pointer mx-1"
                                  type="button"
                                >
                                  بله
                                </button>
                                <span className="text-slate-600">/</span>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-slate-400 hover:underline cursor-pointer"
                                  type="button"
                                >
                                  لغو
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(opt)}
                                  className="p-1.5 hover:bg-cyan-500/10 text-cyan-400 hover:border hover:border-cyan-500/20 rounded-lg cursor-pointer transition"
                                  title="ویرایش"
                                  type="button"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(opt.id)}
                                  className="p-1.5 hover:bg-rose-500/10 text-rose-400 hover:border hover:border-rose-500/20 rounded-lg cursor-pointer transition"
                                  title="حذف"
                                  type="button"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
