/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DropdownCategory =
  | "referral"
  | "lead_source"
  | "service"
  | "sub_service"
  | "lead_status"
  | "opportunity_status"
  | "consultant"
  | "payment_type"
  | "payment_method";

export interface DropdownOption {
  id: string;
  category: DropdownCategory;
  label: string; // Persian label
  color: string; // Hex color code for badges
  parent_id?: string; // For hierarchical "sub_service" linked to "service"
  sort_order: number;
}

export interface CustomFieldDefinition {
  id: string;
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "dropdown";
  enabled: boolean;
}

export interface Lead {
  id: string;
  full_name: string;
  mobile: string;
  referral: string; // dropdown ID
  lead_source: string; // dropdown ID
  service: string; // dropdown ID
  sub_service: string; // dropdown ID
  lead_status: string; // dropdown ID
  request_challenge: string;
  sms_text: string;
  module_type: "lead" | "opportunity";
  opportunity_status?: string; // dropdown ID
  consultant?: string; // dropdown ID
  price?: number;
  payment_type?: string; // dropdown ID
  payment_method?: string; // dropdown ID
  converted_at?: string; // ISO DateTime
  created_at: string;
  is_starred?: boolean; // starred status indicator
  
  // Custom metadata fields added to match ERP layout screenshot
  industry?: string;
  telephone?: string;
  consultation_topic?: string;
  province?: string;
  service_type?: string;
  consultation_type?: string;
  city?: string;
  company?: string;
  address?: string;
  send_sms_unanswered?: string;

  [key: string]: any; // supports dynamic customizable fields
}

export interface AuditLog {
  id: string;
  lead_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  changed_by_name: string;
  changed_by_role: string;
  change_type: "create" | "update" | "convert";
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  lead_id?: string;
  notification_type: "assignment" | "activity_reminder";
  is_read: boolean;
  created_at: string;
}

export interface Activity {
  id: string;
  lead_id: string;
  title: string;
  activity_type: "call" | "meeting" | "mobile_call";
  priority: "low" | "medium" | "high" | "critical";
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string; // HH:MM
  is_done: boolean;
  author_name: string;
  created_at: string;
}

export interface Note {
  id: string;
  lead_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: "admin" | "consultant" | "supervisor" | "developer";
  password?: string;
  approved?: boolean;
}

export const CATEGORY_LABELS: Record<DropdownCategory, string> = {
  referral: "ارجاع به",
  lead_source: "منبع سرنخ",
  service: "سرویس (خدمت)",
  sub_service: "زیرمنوی سرویس",
  lead_status: "وضعیت سرنخ",
  opportunity_status: "وضعیت فرصت",
  consultant: "کارشناس فروش",
  payment_type: "نوع پرداخت",
  payment_method: "روش پرداخت",
};
