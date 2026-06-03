/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DropdownOption, Lead, Activity, Note, AuditLog, Notification, User, CustomFieldDefinition } from "../types";
import { sha256 } from "./crypto";

// Default seed data for Persian enterprise configuration
const DEFAULT_DROPDOWNS: DropdownOption[] = [
  // Referral (ارجاع به)
  { id: "ref_1", category: "referral", label: "محمد رضا فتح آبادی", color: "#06b6d4", sort_order: 1 },
  { id: "ref_2", category: "referral", label: "مهتاب ناصری", color: "#10b981", sort_order: 2 },
  { id: "ref_3", category: "referral", label: "علی سجادی", color: "#a855f7", sort_order: 3 },
  // Lead Source (منبع سرنخ)
  { id: "src_1", category: "lead_source", label: "تبلیغاتی پیامکی ETOT", color: "#f97316", sort_order: 1 },
  { id: "src_2", category: "lead_source", label: "کمپین اینستاگرام", color: "#ec4899", sort_order: 2 },
  { id: "src_3", category: "lead_source", label: "گوگل ادز / سئو", color: "#3b82f6", sort_order: 3 },
  { id: "src_4", category: "lead_source", label: "نمایشگاه بین‌المللی", color: "#f59e0b", sort_order: 4 },
  // Service (سرویس)
  { id: "srv_1", category: "service", label: "حقوقی", color: "#3b82f6", sort_order: 1 },
  { id: "srv_2", category: "service", label: "امور ثبتی", color: "#ec4899", sort_order: 2 },
  { id: "srv_3", category: "service", label: "مشاوره حقوقی", color: "#10b981", sort_order: 3 },
  // Sub service (زیرمنوی سرویس)
  { id: "sub_1", category: "sub_service", label: "وصول مطالبات", color: "#14b8a6", parent_id: "srv_1", sort_order: 1 },
  { id: "sub_2", category: "sub_service", label: "انحصار وراثت", color: "#06b6d4", parent_id: "srv_1", sort_order: 2 },
  { id: "sub_3", category: "sub_service", label: "ثبت شرکت تجارتی", color: "#f59e0b", parent_id: "srv_2", sort_order: 1 },
  // Lead status (وضعیت سرنخ)
  { id: "lst_1", category: "lead_status", label: "همین الان تماس اولیه بگیر", color: "#ef4444", sort_order: 1 },
  { id: "lst_2", category: "lead_status", label: "ارزیابی اولیه شده", color: "#f59e0b", sort_order: 2 },
  { id: "lst_3", category: "lead_status", label: "پیگیری مجدد/تماس مجدد", color: "#a855f7", sort_order: 3 },
  { id: "lst_4", category: "lead_status", label: "عدم پاسخگویی", color: "#ec4899", sort_order: 4 },
  // Opportunity status (وضعیت فرصت)
  { id: "ost_1", category: "opportunity_status", label: "جلسه دمو حضوری", color: "#10b981", sort_order: 1 },
  { id: "ost_2", category: "opportunity_status", label: "صدور و ارسال پیش‌فاکتور", color: "#3b82f6", sort_order: 2 },
  { id: "ost_3", category: "opportunity_status", label: "در انتظار پرداخت پیش‌پرداخت", color: "#f59e0b", sort_order: 3 },
  { id: "ost_4", category: "opportunity_status", label: "عقد نهایی قرارداد", color: "#06b6d4", sort_order: 4 },
  { id: "ost_5", category: "opportunity_status", label: "انصراف/معلق", color: "#6b7280", sort_order: 5 },
  // Consultant (مشاور)
  { id: "con_1", category: "consultant", label: "جناب آقای مهندس حمیدی", color: "#3b82f6", sort_order: 1 },
  { id: "con_2", category: "consultant", label: "سرکار خانم دکتر کریمی", color: "#10b981", sort_order: 2 },
  { id: "con_3", category: "consultant", label: "جناب آقای دکتر یزدانی", color: "#f43f5e", sort_order: 3 },
  // Payment Type (نوع پرداخت)
  { id: "pty_1", category: "payment_type", label: "نقدی یک مرحله‌ای", color: "#10b981", sort_order: 1 },
  { id: "pty_2", category: "payment_type", label: "اقساطی ماهیانه", color: "#a855f7", sort_order: 2 },
  { id: "pty_3", category: "payment_type", label: "۵۰٪ پیش‌پرداخت + تسویه نهایی", color: "#f59e0b", sort_order: 3 },
  // Payment Method (روش پرداخت)
  { id: "pm_1", category: "payment_method", label: "حواله بین بانکی پایا/ساتنا", color: "#3b82f6", sort_order: 1 },
  { id: "pm_2", category: "payment_method", label: "چک‌های صیادی معتبر بنفش", color: "#10b981", sort_order: 2 },
  { id: "pm_3", category: "payment_method", label: "واریز به کارت تجاری سازمان", color: "#ec4899", sort_order: 3 },
];

const DEFAULT_USERS: User[] = [
  { id: "usr_dev", username: "Mohamad1378", full_name: "توسعه‌دهنده سیستم (Developer)", email: "mohamad1378@crm.com", role: "developer", password: "09386561626mM@", approved: true },
  { id: "usr_1", username: "izatesplay", full_name: "مدیر ارشد سیستم", email: "admin@crm.com", role: "admin", password: "09386561626mM@", approved: true },
  { id: "usr_2", username: "consultant", full_name: "خانم سارا خسروی", email: "sara@crm.com", role: "consultant", password: "123", approved: true },
  { id: "usr_4", username: "supervisor", full_name: "مهندس علی کرمی (سرپرست)", email: "ali@crm.com", role: "supervisor", password: "123", approved: true },
];

const DEFAULT_LEADS: Lead[] = [
  {
    id: "lead_1",
    full_name: "محمد رضا فتح آبادی",
    mobile: "09121196033",
    referral: "ref_1",
    lead_source: "src_1",
    service: "srv_1",
    sub_service: "sub_1",
    lead_status: "lst_1",
    request_challenge: "۱۰ خرداد خیانت در امانت کلاهبرداری وصول مطالبات و استرداد لاشه چک‌های امانتی شرکت توسعه تجارت.",
    sms_text: "همین الان تماس اولیه با آقای فتح‌آبادی برقرار شود جهت هماهنگی جلسه حضوری وکالت حقوقی.",
    module_type: "lead",
    is_starred: true,
    created_at: "2026-06-01T11:29:00Z"
  },
  {
    id: "lead_2",
    full_name: "جناب آقای محمدی ارشد",
    mobile: "09121523005",
    referral: "ref_1",
    lead_source: "src_1",
    service: "srv_1",
    sub_service: "sub_2",
    lead_status: "lst_1",
    request_challenge: "پیگیری شکوائیه کلاهبرداری اینترنتی و فیشینگ حساب بانکی سپهر صادرات.",
    sms_text: "مکالمه اولیه انجام شد منتظر ارائه مستندات چاپی حساب هستیم.",
    module_type: "lead",
    is_starred: false,
    created_at: "2026-06-01T11:32:00Z"
  },
  {
    id: "lead_3",
    full_name: "سرکار خانم شیما هدایت",
    mobile: "09122703668",
    referral: "ref_2",
    lead_source: "src_2",
    service: "srv_2",
    sub_service: "sub_3",
    lead_status: "lst_1",
    request_challenge: "تقاضای اخذ مجوز رسمی انجمن‌های عالی صنفی و ثبت برند جدید بازرگانی الکترونیک.",
    sms_text: "",
    module_type: "lead",
    is_starred: true,
    created_at: "2026-05-31T14:02:00Z"
  },
  {
    id: "opp_1",
    full_name: "مهندس امین باقری",
    mobile: "09129901658",
    referral: "ref_3",
    lead_source: "src_3",
    service: "srv_3",
    sub_service: "sub_1",
    lead_status: "lst_3",
    request_challenge: "قبول وکالت و مشاوره حقوقی پیگیری پرونده وصول مطالبات تجاری ملکی.",
    sms_text: "پیش‌فاکتور مالیات قرارداد تنظیم و ارسال گردید.",
    module_type: "opportunity",
    opportunity_status: "ost_2",
    consultant: "con_2",
    price: 450000000,
    payment_type: "pty_3",
    payment_method: "pm_1",
    converted_at: "2026-05-31T09:00:00Z",
    created_at: "2026-05-25T11:00:00Z"
  }
];

const DEFAULT_NOTES: Note[] = [
  {
    id: "note_1",
    lead_id: "lead_1",
    content: "مشتری تاکید زیادی روی زمانبندی پروژه دارد. بسیار باپرستیژ و منظم هستند.",
    author_name: "مهندس صابر راد",
    created_at: "2026-05-28T14:35:00Z"
  },
  {
    id: "note_2",
    lead_id: "opp_1",
    content: "امور حسابداری کلینیک هم مایل به دریافت آفر مشاوره مالیاتی جداگانه در آینده دور است.",
    author_name: "خانم سارا خسروی",
    created_at: "2026-05-31T09:12:00Z"
  }
];

const DEFAULT_ACTIVITIES: Activity[] = [
  {
    id: "act_1",
    lead_id: "lead_1",
    title: "تماس تلفنی جهت هماهنگی جلسه حضوری هیئت مدیره",
    activity_type: "call",
    priority: "high",
    scheduled_date: "2026-06-03", // relative to 2026-06-01
    scheduled_time: "11:30",
    is_done: false,
    author_name: "مهندس صابر راد",
    created_at: "2026-05-29T08:00:00Z"
  },
  {
    id: "act_2",
    lead_id: "opp_1",
    title: "ارسال مدارک فاکتور و تاییدیه روش پرداخت قسط اول",
    activity_type: "mobile_call",
    priority: "critical",
    scheduled_date: "2026-06-01", // Today
    scheduled_time: "14:00",
    is_done: false,
    author_name: "خانم سارا خسروی",
    created_at: "2026-05-31T09:15:00Z"
  },
  {
    id: "act_3",
    lead_id: "lead_2",
    title: "ملاقات حضوری در لوکیشن پروژه جهت متره‌برآورد عارضه کار",
    activity_type: "meeting",
    priority: "medium",
    scheduled_date: "2026-05-31", // Overdue
    scheduled_time: "09:00",
    is_done: true,
    author_name: "خانم سارا خسروی",
    created_at: "2026-05-30T11:00:00Z"
  }
];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log_1",
    lead_id: "lead_1",
    field_name: "وضعیت سرنخ",
    old_value: "سرنخ خام (جدید)",
    new_value: "ارزیابی اولیه شده",
    changed_by_name: "مهندس صابر راد",
    changed_by_role: "مدیر ارشد",
    change_type: "update",
    created_at: "2026-05-28T14:32:00Z"
  },
  {
    id: "log_2",
    lead_id: "opp_1",
    field_name: "نوع رکورد",
    old_value: "سرنخ",
    new_value: "فرصت فروش",
    changed_by_name: "خانم سارا خسروی",
    changed_by_role: "مشاور",
    change_type: "convert",
    created_at: "2026-05-31T09:00:00Z"
  }
];

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: "notif_1",
    user_id: "usr_1",
    title: "سرنخ جدید ثبت شد",
    message: "سرنخ جدیدی با نام 'سرکار خانم شیلا یوسفی' ثبت شده و نیاز به بررسی سریع دارد.",
    lead_id: "lead_2",
    notification_type: "assignment",
    is_read: false,
    created_at: "2026-05-30T10:15:00Z"
  }
];

// LocalStorage Persistence Wrapper
export class CRMDatabase {
  private static get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(`crm_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static isSyncing = false;

  private static set<T>(key: string, value: T, bypassAutoSync = false): void {
    try {
      localStorage.setItem(`crm_${key}`, JSON.stringify(value));
      if (!bypassAutoSync && !this.isSyncing) {
        if (["users", "dropdowns", "custom_fields", "leads", "activities", "notes", "audit_logs", "notifications"].includes(key)) {
          this.syncWithMySQL().catch(e => console.error("Auto sync failed", e));
        }
      }
    } catch (e) {
      console.error("Storage failed", e);
    }
  }

  // Database Connection logs, stats, and checks
  static getDBLogs(): Array<{ timestamp: string; type: "info" | "error" | "success"; message: string; details?: string }> {
    return this.get<Array<{ timestamp: string; type: "info" | "error" | "success"; message: string; details?: string }>>("db_logs", []);
  }

  static addDBLog(type: "info" | "error" | "success", message: string, details?: string): void {
    const logs = this.getDBLogs();
    logs.unshift({
      timestamp: new Date().toISOString(),
      type,
      message,
      details
    });
    // Keep last 100 logs
    this.set("db_logs", logs.slice(0, 100), true);
    window.dispatchEvent(new CustomEvent("crm_db_logs_updated"));
  }

  static resetDBLogs(): void {
    this.set("db_logs", [], true);
    window.dispatchEvent(new CustomEvent("crm_db_logs_updated"));
  }

  static async checkConnectionStatus(): Promise<{ success: boolean; message: string; dbName?: string; tables?: string[] }> {
    try {
      const resp = await fetch("./api.php?action=status");
      const data = await resp.json();
      if (resp.ok && data.status === "success") {
        this.addDBLog("success", "تست اتصال به دیتابیس MySQL با موفقیت انجام شد.", `دیتابیس: ${data.database} | ماردها: ${data.tables_configured ? data.tables_configured.join(', ') : ''}`);
        return {
          success: true,
          message: data.message,
          dbName: data.database,
          tables: data.tables_configured
        };
      } else {
        const errMsg = data.message || "پاسخ نامشخص از API";
        this.addDBLog("error", "تست اتصال به دیتابیس با شکست مواجه شد.", errMsg);
        return { success: false, message: errMsg };
      }
    } catch (e: any) {
      const errMsg = e?.message || String(e);
      this.addDBLog("error", "خطای شبکه یا عدم پاسخگویی از فایل api.php", errMsg);
      return { success: false, message: `عدم امکان دسترسی به دیتابیس: ${errMsg}` };
    }
  }

  static async syncWithMySQL(): Promise<boolean> {
    if (this.isSyncing) return false;
    try {
      this.isSyncing = true;
      this.addDBLog("info", "در حال ارسال همگام‌سازی جریانات مالی و لیدهای جدید به MySQL...");
      
      const payload = {
        users: this.get<User[]>("users", DEFAULT_USERS),
        dropdowns: this.get<DropdownOption[]>("dropdowns", []),
        custom_fields: this.get<CustomFieldDefinition[]>("custom_fields", []),
        leads: this.get<Lead[]>("leads", []),
        activities: this.get<Activity[]>("activities", []),
        notes: this.get<Note[]>("notes", []),
        audit_logs: this.get<AuditLog[]>("audit_logs", []),
        notifications: this.get<Notification[]>("notifications", [])
      };

      const resp = await fetch("./api.php?action=sync_all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      if (resp.ok && data.status === "success") {
        this.addDBLog("success", "همگام‌سازی کامل داده‌ها با دیتابیس MySQL با موفقیت انجام شد.");
        return true;
      } else {
        const errorMsg = data.message || "خطای ناشناخته در همگام‌سازی";
        this.addDBLog("error", "همگام‌سازی با MySQL با شکست مواجه شد.", errorMsg);
        return false;
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      this.addDBLog("error", "خطای شبکه در فرآیند ذخیره‌سازی داده‌ها روی MySQL", errorMsg);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  static async fetchFromMySQL(): Promise<boolean> {
    if (this.isSyncing) return false;
    try {
      this.isSyncing = true;
      this.addDBLog("info", "در حال واکشی آخرین وضعیت جریانات از دیتابیس MySQL...");
      const resp = await fetch("./api.php?action=get_all");
      const resData = await resp.json();
      
      if (resp.ok && resData.status === "success" && resData.data) {
        const dbData = resData.data;
        if (dbData.users && dbData.users.length > 0) this.set("users", dbData.users, true);
        if (dbData.dropdowns && dbData.dropdowns.length > 0) this.set("dropdowns", dbData.dropdowns, true);
        if (dbData.custom_fields && dbData.custom_fields.length > 0) {
          const mappedFields = dbData.custom_fields.map((f: any) => ({
            id: f.id,
            key: f.key,
            label: f.label,
            type: f.type,
            enabled: f.enabled ? true : false
          }));
          this.set("custom_fields", mappedFields, true);
        }
        if (dbData.leads && dbData.leads.length > 0) {
          const mappedLeads = dbData.leads.map((l: any) => ({
            ...l,
            is_starred: l.is_starred ? true : false,
            price: l.price !== null ? Number(l.price) : null
          }));
          this.set("leads", mappedLeads, true);
        }
        if (dbData.activities && dbData.activities.length > 0) {
          const mappedActs = dbData.activities.map((a: any) => ({
            ...a,
            is_done: a.is_done ? true : false
          }));
          this.set("activities", mappedActs, true);
        }
        if (dbData.notes && dbData.notes.length > 0) this.set("notes", dbData.notes, true);
        if (dbData.audit_logs && dbData.audit_logs.length > 0) this.set("audit_logs", dbData.audit_logs, true);
        if (dbData.notifications && dbData.notifications.length > 0) {
          const mappedNotifs = dbData.notifications.map((n: any) => ({
            ...n,
            is_read: n.is_read ? true : false
          }));
          this.set("notifications", mappedNotifs, true);
        }
        
        this.addDBLog("success", "دریافت اطلاعات با موفقیت از دیتابیس MySQL انجام و بروزرسانی شد.");
        window.dispatchEvent(new CustomEvent("crm_database_synced"));
        return true;
      } else {
        const errorMsg = resData.message || "خطای ناشناخته در سرور";
        this.addDBLog("error", "خطا در واکشی اطلاعات از دیتابیس MySQL", errorMsg);
        return false;
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      this.addDBLog("error", "خطای ارتباطی با وب سرویس دیتابیس اصلی", errorMsg);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  // Active User / Auth Storage
  static getActiveUser(): User | null {
    try {
      const data = sessionStorage.getItem("crm_active_user");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static setActiveUser(user: User | null): void {
    try {
      if (user === null) {
        sessionStorage.removeItem("crm_active_user");
      } else {
        sessionStorage.setItem("crm_active_user", JSON.stringify(user));
      }
    } catch (e) {
      console.error("Session storage failed", e);
    }
  }

  static getUsers(): User[] {
    const users = this.get<User[]>("users", DEFAULT_USERS);
    let changed = false;
    const upgraded = users.map(u => {
      if (u.password && !/^[0-9a-f]{64}$/i.test(u.password)) {
        u.password = sha256(u.password);
        changed = true;
      }
      return u;
    });
    if (changed) {
      this.set("users", upgraded);
    }
    return upgraded;
  }

  static registerUser(user: Omit<User, "id">): User {
    const users = this.getUsers();
    const newUser: User = { 
      ...user, 
      id: `usr_${Date.now()}`,
      approved: false, // Force all registry roles (including newly created admins) to go through explicit admin approval is required
      password: user.password ? sha256(user.password) : undefined,
    };
    users.push(newUser);
    this.set("users", users);
    return newUser;
  }

  static updateUser(id: string, updated: Partial<User>): User {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx > -1) {
      users[idx] = { ...users[idx], ...updated };
      this.set("users", users);
      return users[idx];
    }
    throw new Error("User not found");
  }

  static deleteUser(id: string): void {
    const users = this.getUsers();
    const filtered = users.filter(u => u.id !== id);
    this.set("users", filtered);
  }

  // System default fields disabled status tracking
  static getDisabledSystemFields(): string[] {
    return this.get<string[]>("disabled_system_fields", []);
  }

  static saveDisabledSystemFields(fields: string[]): void {
    this.set("disabled_system_fields", fields);
  }

  // Custom customizable Leads metadata fields
  static getCustomFields(): CustomFieldDefinition[] {
    const defaultFields: CustomFieldDefinition[] = [
      { id: "cf_city", key: "city", label: "شهرستان", type: "text", enabled: true },
      { id: "cf_company", key: "company", label: "نام سازمان/شرکت", type: "text", enabled: true },
      { id: "cf_province", key: "province", label: "استان", type: "text", enabled: true },
      { id: "cf_industry", key: "industry", label: "صنعت/حرفه", type: "text", enabled: true },
    ];
    return this.get<CustomFieldDefinition[]>("custom_fields", defaultFields);
  }

  static saveCustomFields(fields: CustomFieldDefinition[]): void {
    this.set("custom_fields", fields);
  }

  static addCustomField(field: Omit<CustomFieldDefinition, "id">): CustomFieldDefinition {
    const fields = this.getCustomFields();
    const newField = { ...field, id: `cf_${Date.now()}` };
    fields.push(newField);
    this.saveCustomFields(fields);
    return newField;
  }

  static updateCustomField(id: string, updated: Partial<CustomFieldDefinition>): CustomFieldDefinition {
    const fields = this.getCustomFields();
    const idx = fields.findIndex(f => f.id === id);
    if (idx > -1) {
      fields[idx] = { ...fields[idx], ...updated };
      this.saveCustomFields(fields);
      return fields[idx];
    }
    throw new Error("Custom field not found");
  }

  static deleteCustomField(id: string): void {
    const fields = this.getCustomFields();
    const filtered = fields.filter(f => f.id !== id);
    this.saveCustomFields(filtered);
  }

  // Dropdown options
  static getDropdowns(): DropdownOption[] {
    return this.get<DropdownOption[]>("dropdowns", DEFAULT_DROPDOWNS);
  }

  static saveDropdowns(options: DropdownOption[]): void {
    this.set("dropdowns", options);
  }

  static addDropdown(option: Omit<DropdownOption, "id">): DropdownOption {
    const dropdowns = this.getDropdowns();
    const newOption = { ...option, id: `opt_${Date.now()}` };
    dropdowns.push(newOption);
    this.saveDropdowns(dropdowns);
    return newOption;
  }

  static updateDropdown(id: string, updated: Partial<DropdownOption>): DropdownOption {
    const dropdowns = this.getDropdowns();
    const idx = dropdowns.findIndex(o => o.id === id);
    if (idx > -1) {
      dropdowns[idx] = { ...dropdowns[idx], ...updated };
      this.saveDropdowns(dropdowns);
      return dropdowns[idx];
    }
    throw new Error("Option not found");
  }

  static deleteDropdown(id: string): void {
    const dropdowns = this.getDropdowns();
    const filtered = dropdowns.filter(o => o.id !== id);
    this.saveDropdowns(filtered);
  }

  // Leads & Opportunities
  static getLeads(): Lead[] {
    return this.get<Lead[]>("leads", DEFAULT_LEADS);
  }

  static saveLeads(leads: Lead[]): void {
    this.set("leads", leads);
  }

  static addLead(lead: Omit<Lead, "id" | "created_at">, creator: User): Lead {
    const leads = this.getLeads();
    const newLead: Lead = {
      ...lead,
      id: `lead_${Date.now()}`,
      created_at: new Date().toISOString(),
    } as Lead;
    leads.push(newLead);
    this.saveLeads(leads);

    // Save initial Audit Log
    this.addAuditLog({
      lead_id: newLead.id,
      field_name: "رکورد جدید",
      old_value: "عدم وجود",
      new_value: newLead.full_name,
      changed_by_name: creator.full_name,
      changed_by_role: creator.role === "admin" ? "مدیر ارشد" : "مشاور",
      change_type: "create"
    });

    return newLead;
  }

  static updateLead(id: string, updated: Partial<Lead>, modifier: User): Lead {
    const leads = this.getLeads();
    const idx = leads.findIndex(l => l.id === id);
    if (idx === -1) throw new Error("Lead not found");

    const oldLead = leads[idx];
    const newLead = { ...oldLead, ...updated };
    leads[idx] = newLead;
    this.saveLeads(leads);

    // Dynamic Audit Log Generator
    const categoryCache = this.getDropdowns();
    const getOptionLabel = (optId?: string) => {
      if (!optId) return "-";
      return categoryCache.find(o => o.id === optId)?.label || optId;
    };

    const changesRecorded: Array<Omit<AuditLog, "id" | "created_at">> = [];

    // Fields list to inspect for log records
    const fieldsToCheck: { key: keyof Lead; label: string; isDropdown?: boolean }[] = [
      { key: "full_name", label: "نام کامل" },
      { key: "mobile", label: "شماره همراه" },
      { key: "referral", label: "ارجاع به", isDropdown: true },
      { key: "lead_source", label: "منبع سرنخ", isDropdown: true },
      { key: "service", label: "سرویس کلیدی", isDropdown: true },
      { key: "sub_service", label: "زیرمنوی سرویس", isDropdown: true },
      { key: "lead_status", label: "وضعیت سرنخ", isDropdown: true },
      { key: "request_challenge", label: "چالش / جزئیات درخواست" },
      { key: "sms_text", label: "متن پیامک" },
      { key: "opportunity_status", label: "وضعیت فرصت", isDropdown: true },
      { key: "consultant", label: "کارشناس فروش", isDropdown: true },
      { key: "price", label: "قیمت پروژه" },
      { key: "payment_type", label: "نوع پرداخت قرارداد", isDropdown: true },
      { key: "payment_method", label: "روش تسویه پرداخت", isDropdown: true },
    ];

    fieldsToCheck.forEach(({ key, label, isDropdown }) => {
      if (updated[key] !== undefined && updated[key] !== oldLead[key]) {
        let oldValStr = String(oldLead[key] ?? "-");
        let newValStr = String(updated[key] ?? "-");

        if (isDropdown) {
          oldValStr = getOptionLabel(oldLead[key] as string);
          newValStr = getOptionLabel(updated[key] as string);
        }

        changesRecorded.push({
          lead_id: id,
          field_name: label,
          old_value: oldValStr,
          new_value: newValStr,
          changed_by_name: modifier.full_name,
          changed_by_role: modifier.role === "admin" ? "مدیر ارشد" : "مشاور",
          change_type: "update"
        });
      }
    });

    // Check if converted to opportunity
    if (updated.module_type === "opportunity" && oldLead.module_type === "lead") {
      changesRecorded.push({
        lead_id: id,
        field_name: "نوع ماژول سیستم",
        old_value: "سرنخ سرگردان",
        new_value: "فرصت فروش فعال",
        changed_by_name: modifier.full_name,
        changed_by_role: modifier.role === "admin" ? "مدیر ارشد" : "مشاور",
        change_type: "convert"
      });
    }

    changesRecorded.forEach(log => this.addAuditLog(log));

    return newLead;
  }

  static deleteLead(id: string): void {
    const leads = this.getLeads();
    this.saveLeads(leads.filter(l => l.id !== id));
    // Clean associated tasks, logs, notes
    this.set("activities", this.getActivities().filter(a => a.lead_id !== id));
    this.set("notes", this.getNotes().filter(n => n.lead_id !== id));
    this.set("audit_logs", this.getAuditLogs().filter(a => a.lead_id !== id));
  }

  // Audit Logs
  static getAuditLogs(): AuditLog[] {
    return this.get<AuditLog[]>("audit_logs", DEFAULT_AUDIT_LOGS);
  }

  static addAuditLog(log: Omit<AuditLog, "id" | "created_at">): AuditLog {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog); // Put newest log at the top
    this.set("audit_logs", logs);
    return newLog;
  }

  // Notes
  static getNotes(): Note[] {
    return this.get<Note[]>("notes", DEFAULT_NOTES);
  }

  static addNote(note: Omit<Note, "id" | "created_at">): Note {
    const notes = this.getNotes();
    const newNote: Note = {
      ...note,
      id: `note_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    notes.unshift(newNote);
    this.set("notes", notes);
    return newNote;
  }

  static deleteNote(id: string): void {
    const notes = this.getNotes();
    this.set("notes", notes.filter(n => n.id !== id));
  }

  // Activities
  static getActivities(): Activity[] {
    return this.get<Activity[]>("activities", DEFAULT_ACTIVITIES);
  }

  static saveActivities(acts: Activity[]): void {
    this.set("activities", acts);
  }

  static addActivity(act: Omit<Activity, "id" | "created_at">): Activity {
    const acts = this.getActivities();
    const newAct: Activity = {
      ...act,
      id: `act_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    acts.unshift(newAct);
    this.saveActivities(acts);
    return newAct;
  }

  static toggleActivityDone(id: string): Activity {
    const acts = this.getActivities();
    const idx = acts.findIndex(a => a.id === id);
    if (idx > -1) {
      acts[idx].is_done = !acts[idx].is_done;
      this.saveActivities(acts);
      return acts[idx];
    }
    throw new Error("Activity not found");
  }

  static deleteActivity(id: string): void {
    const acts = this.getActivities();
    this.saveActivities(acts.filter(a => a.id !== id));
  }

  // Notifications
  static getNotifications(): Notification[] {
    return this.get<Notification[]>("notifications", DEFAULT_NOTIFICATIONS);
  }

  static addNotification(notif: Omit<Notification, "id" | "created_at">): Notification {
    const notifs = this.getNotifications();
    const newNotif: Notification = {
      ...notif,
      id: `notif_${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    notifs.unshift(newNotif);
    this.set("notifications", notifs);
    return newNotif;
  }

  static markNotificationAsRead(id: string): void {
    const notifs = this.getNotifications();
    const idx = notifs.findIndex(n => n.id === id);
    if (idx > -1) {
      notifs[idx].is_read = true;
      this.set("notifications", notifs);
    }
  }

  static markAllNotificationsAsRead(): void {
    const notifs = this.getNotifications();
    notifs.forEach(n => n.is_read = true);
    this.set("notifications", notifs);
  }
}
