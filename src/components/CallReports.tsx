/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import { User, Lead, DropdownOption } from "../types";
import { CRMDatabase } from "../utils/db";
import * as XLSX from "xlsx";
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  Download,
  FileSpreadsheet,
  Users,
  DollarSign,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  CreditCard,
  Award,
  Layers,
  ArrowUpDown,
  Printer,
  ShieldAlert,
  Trash2,
  CalendarDays,
  BarChart3,
  Sliders,
  Check
} from "lucide-react";

interface CallReportsProps {
  activeUser: User;
  leads: Lead[];
  dropdowns: DropdownOption[];
  wonStatusRef: string;
  priceFieldRef: string;
  onRefreshData: () => void;
}

export interface RawCallRecord {
  id: string;
  consultantId: string; // Ext e.g. "251" or name
  rawConsultantVal: string;
  direction: "inbound" | "outbound";
  callType: string; // "outbound" | "incoming" | "local"
  isLocal: boolean; // Flag if call was "local" (تماس داخلی)
  status: "answer" | "noanswer" | "mistake";
  rawStatus: string;
  isBusy: boolean; // Flag if was originally Busy
  callDate: string; // YYYY-MM-DD
  callMonth: string; // YYYY-MM
  callTime?: string;
  customerPhone?: string;
  notes?: string;
}

export interface ConsultantReportItem {
  consultantIdentifier: string; // e.g. "251"
  consultantName: string;
  consultantExtension?: string;
  matchedId?: string;
  periodLabel?: string; // Date or Month in Daily/Monthly mode
  
  // Call metrics from uploaded file:
  totalCallsMade: number; // برقرار شده (خروجی)
  inboundCalls: number; // ورودی (incoming)
  localCalls: number; // تماس‌های داخلی (local) - کسرشونده از تماس‌های موفق ⭐
  answeredCalls: number; // Answer (پاسخ داده شده)
  noAnswerCalls: number; // NoAnswer + Busy (بی‌پاسخ و اشغال) ⭐
  busyCallsCount: number; // تعداد مختص Busy
  mistakeCalls: number; // Mistake (اشتباه/ناموفق)
  
  // Divar Leads from BOTH leads & opportunities on the same date:
  divarRawLeadsCount: number; // سرنخ خام
  divarOppsCount: number; // فرصت معامله
  divarLeadsCount: number; // مجموع لیدهای دیوار (سرنخ + فرصت)
  matchingDivarRecords: Lead[];
  
  // Total Successful Calls:
  // (Answer + لیدهای دیوار همان روز) - تماس‌های داخلی (Local) ⭐
  totalSuccessfulCalls: number;
  callSuccessRate: number; // درصد موفقیت
  
  // Sales & Cash Metrics from CRM:
  totalSalesVolume: number; // مبلغ فروش کل (تومان)
  cashSalesVolume: number; // مبلغ فروش نقدی (تومان)
  totalSalesCount: number; // تعداد کل فروش
  cashSalesCount: number; // تعداد فروش نقدی
  wonRecords: Lead[];
}

export default function CallReports({
  activeUser,
  leads,
  dropdowns,
  wonStatusRef,
  priceFieldRef,
  onRefreshData
}: CallReportsProps) {
  // Access control check: Only admin, supervisor, and developer allowed
  const hasAccess =
    activeUser.role === "admin" ||
    activeUser.role === "supervisor" ||
    activeUser.role === "developer";

  // Tab View Mode: Cumulative (تجمیعی), Daily (روزانه), Monthly (ماهانه)
  const [reportViewMode, setReportViewMode] = useState<"cumulative" | "daily" | "monthly">("cumulative");

  // Raw parsed JSON rows from Excel
  const [rawExcelRows, setRawExcelRows] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("crm_uploaded_raw_excel_rows");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [excelColumns, setExcelColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("crm_uploaded_excel_columns");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Selected column mapping keys
  const [mappedConsultantCol, setMappedConsultantCol] = useState<string>(() => {
    return localStorage.getItem("crm_map_col_consultant") || "";
  });
  const [mappedStatusCol, setMappedStatusCol] = useState<string>(() => {
    return localStorage.getItem("crm_map_col_status") || "";
  });
  const [mappedCallTypeCol, setMappedCallTypeCol] = useState<string>(() => {
    return (
      localStorage.getItem("crm_map_col_call_type") ||
      localStorage.getItem("crm_map_col_direction") ||
      ""
    );
  });
  const [mappedDateCol, setMappedDateCol] = useState<string>(() => {
    return localStorage.getItem("crm_map_col_date") || "";
  });

  const [uploadedFileName, setUploadedFileName] = useState<string>(() => {
    return localStorage.getItem("crm_uploaded_call_filename") || "";
  });

  // Show column mapping settings toolbar
  const [showColumnMapping, setShowColumnMapping] = useState(false);

  // Daily Mode selected date filter
  const [dailySelectedDate, setDailySelectedDate] = useState<string>("all");
  // Monthly Mode selected month filter
  const [monthlySelectedMonth, setMonthlySelectedMonth] = useState<string>("all");

  const [searchFilter, setSearchFilter] = useState<string>("");
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper resolvers
  const getBadgeLabel = (id?: string) => dropdowns.find((d) => d.id === id)?.label || "";

  // Helper: Normalize Date (YYYY-MM-DD)
  const normalizeDateString = (val: any): { date: string; month: string } => {
    if (!val) {
      const today = new Date().toISOString().slice(0, 10);
      return { date: today, month: today.slice(0, 7) };
    }
    if (typeof val === "number") {
      const date = new Date((val - (25567 + 2)) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        const d = date.toISOString().slice(0, 10);
        return { date: d, month: d.slice(0, 7) };
      }
    }
    const str = String(val).trim();
    const isoMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, "0");
      const day = isoMatch[3].padStart(2, "0");
      const cleanDate = `${year}-${month}-${day}`;
      return { date: cleanDate, month: `${year}-${month}` };
    }
    const cleanDate = str.slice(0, 10);
    return { date: cleanDate, month: cleanDate.slice(0, 7) };
  };

  // Helper: Extract Extension number from "from" column values
  // e.g. 251, "251", "251" <251>, "Mohammad Reza" <251>, "SIP/251", "داخلی 251"
  const extractExtensionNumber = (val: any): string => {
    if (val === null || val === undefined) return "";
    const str = String(val).trim();
    if (!str) return "";

    // 1. If contains <number>, extract digits inside < >
    const bracketMatch = str.match(/<(\d+)>/);
    if (bracketMatch) return bracketMatch[1];

    // 2. Pure digits (e.g. 251, 101)
    if (/^\d+$/.test(str)) return str;

    // 3. SIP/251 or PJSIP/251
    const sipMatch = str.match(/(?:SIP|PJSIP|DAHDI)?\/(\d{2,4})/i);
    if (sipMatch) return sipMatch[1];

    // 4. Any 3 or 4 digit isolated number in string (e.g. "داخلی 251" or "251 فتح آبادی")
    const numMatch = str.match(/\b(\d{2,4})\b/);
    if (numMatch) return numMatch[1];

    // 5. Strip all non-digits if length is between 2 and 5
    const digitsOnly = str.replace(/\D/g, "");
    if (digitsOnly.length >= 2 && digitsOnly.length <= 5) return digitsOnly;

    return str;
  };

  // Helper: Match consultant by Extension number or Name or ID
  const resolveConsultant = (rawVal: any) => {
    const ext = extractExtensionNumber(rawVal);
    const cleanStr = String(rawVal || "").trim();

    // 1. First Priority: Match by EXTENSION NUMBER
    if (ext) {
      const matchedByExt = dropdowns.find(
        (d) =>
          (d.category === "referral" || d.category === "consultant") &&
          d.extension &&
          (d.extension === ext || String(d.extension).trim() === ext)
      );
      if (matchedByExt) {
        return {
          identifier: ext,
          name: matchedByExt.label,
          extension: matchedByExt.extension || ext,
          id: matchedByExt.id
        };
      }

      // Match by extension in system users
      const allUsers = CRMDatabase.getUsers();
      const matchedUserByExt = allUsers.find(
        (u) => u.extension && (u.extension === ext || String(u.extension).trim() === ext)
      );
      if (matchedUserByExt) {
        return {
          identifier: ext,
          name: matchedUserByExt.full_name,
          extension: matchedUserByExt.extension || ext,
          id: matchedUserByExt.id
        };
      }
    }

    // 2. Match by Label in dropdowns
    if (cleanStr) {
      const referralOpts = dropdowns.filter((d) => d.category === "referral");
      const matchedRef = referralOpts.find(
        (r) =>
          r.id.toLowerCase() === cleanStr.toLowerCase() ||
          r.label.includes(cleanStr) ||
          cleanStr.includes(r.label)
      );
      if (matchedRef) {
        return {
          identifier: matchedRef.extension || cleanStr,
          name: matchedRef.label,
          extension: matchedRef.extension || "",
          id: matchedRef.id
        };
      }

      const consultantOpts = dropdowns.filter((d) => d.category === "consultant");
      const matchedCon = consultantOpts.find(
        (c) =>
          c.id.toLowerCase() === cleanStr.toLowerCase() ||
          c.label.includes(cleanStr) ||
          cleanStr.includes(c.label)
      );
      if (matchedCon) {
        return {
          identifier: matchedCon.extension || cleanStr,
          name: matchedCon.label,
          extension: matchedCon.extension || "",
          id: matchedCon.id
        };
      }

      // Match by system users
      const allUsers = CRMDatabase.getUsers();
      const matchedUsr = allUsers.find(
        (u) =>
          u.id.toLowerCase() === cleanStr.toLowerCase() ||
          u.username.toLowerCase() === cleanStr.toLowerCase() ||
          u.full_name.includes(cleanStr) ||
          cleanStr.includes(u.full_name)
      );
      if (matchedUsr) {
        return {
          identifier: matchedUsr.extension || cleanStr,
          name: matchedUsr.full_name,
          extension: matchedUsr.extension || "",
          id: matchedUsr.id
        };
      }
    }

    // Fallback: If it's a numeric extension like "251"
    if (ext) {
      return {
        identifier: ext,
        name: `کارشناس داخلی ${ext}`,
        extension: ext,
        id: ext
      };
    }

    return { identifier: cleanStr || "نامشخص", name: `کارشناس (${cleanStr || "نامشخص"})`, extension: "", id: cleanStr };
  };

  // Check if a CRM lead or opportunity belongs to a consultant
  const doesLeadBelongToAgent = (
    lead: Lead,
    agentIdentifier: string,
    resolvedId?: string,
    resolvedName?: string,
    resolvedExt?: string
  ): boolean => {
    const idLower = agentIdentifier.toLowerCase();
    const resIdLower = (resolvedId || "").toLowerCase();
    const resNameLower = (resolvedName || "").toLowerCase();
    const ext = resolvedExt || "";

    // Check consultant field
    if (lead.consultant) {
      const conLower = lead.consultant.toLowerCase();
      if (conLower === idLower || conLower === resIdLower) return true;
      const conOpt = dropdowns.find((d) => d.id === lead.consultant);
      if (conOpt) {
        if (conOpt.label && (conOpt.label.includes(idLower) || (resNameLower && conOpt.label.includes(resNameLower)))) return true;
        if (ext && conOpt.extension === ext) return true;
      }
    }

    // Check referral field
    if (lead.referral) {
      const refLower = lead.referral.toLowerCase();
      if (refLower === idLower || refLower === resIdLower) return true;
      const refOpt = dropdowns.find((d) => d.id === lead.referral);
      if (refOpt) {
        if (refOpt.label && (refOpt.label.includes(idLower) || (resNameLower && refOpt.label.includes(resNameLower)))) return true;
        if (ext && refOpt.extension === ext) return true;
      }
    }

    return false;
  };

  // Check if lead source is "دیوار" (Divar)
  const isLeadFromDivar = (lead: Lead): boolean => {
    if (!lead.lead_source) return false;
    if (lead.lead_source === "src_divar") return true;
    const label = getBadgeLabel(lead.lead_source);
    return label.includes("دیوار") || label.toLowerCase().includes("divar") || lead.lead_source.toLowerCase().includes("divar");
  };

  // Auto-Detect Column Keys from Excel Headers
  const autoDetectColumns = (keys: string[]) => {
    // 1. Consultant Column: TOP PRIORITY IS "from" OR "From"
    let cKey = keys.find((k) => {
      const l = k.toLowerCase().trim();
      return l === "from" || l === "src" || l === "source" || l === "caller" || l === "caller_id" || l === "callerid";
    });
    if (!cKey) {
      cKey = keys.find((k) => {
        const l = k.toLowerCase().trim();
        return l.includes("from") || l.includes("داخلی") || l.includes("extension") || l.includes("ext");
      });
    }
    if (!cKey) {
      cKey = keys.find((k) => {
        const l = k.toLowerCase().trim();
        return l.includes("شناسه") || l.includes("کارشناس") || l.includes("consultant") || l.includes("agent") || l.includes("پرسنل");
      });
    }
    if (!cKey) cKey = keys[0];

    // 2. Status Column: TOP PRIORITY IS "call status"
    let sKey = keys.find((k) => {
      const l = k.toLowerCase().trim();
      return l === "call status" || l === "call_status" || l === "callstatus" || l === "disposition" || l === "status";
    });
    if (!sKey) {
      sKey = keys.find((k) => {
        const l = k.toLowerCase().trim();
        return l.includes("status") || l.includes("وضعیت") || l.includes("نتیجه") || l.includes("disposition") || l.includes("result");
      });
    }

    // 3. Call Type Column: TOP PRIORITY IS "call type"
    let tKey = keys.find((k) => {
      const l = k.toLowerCase().trim();
      return l === "call type" || l === "call_type" || l === "calltype" || l === "call direction" || l === "call_direction";
    });
    if (!tKey) {
      tKey = keys.find((k) => {
        const l = k.toLowerCase().trim();
        return l === "direction" || l === "type";
      });
    }
    if (!tKey) {
      tKey = keys.find((k) => {
        const l = k.toLowerCase().trim();
        return (
          l.includes("call type") ||
          l.includes("call_type") ||
          l.includes("نوع") ||
          l.includes("جهت") ||
          l.includes("direction") ||
          l.includes("type")
        );
      });
    }

    // 4. Date Column
    let dKey = keys.find((k) => {
      const l = k.toLowerCase().trim();
      return l === "calldate" || l === "call_date" || l === "date" || l === "start" || l === "datetime";
    });
    if (!dKey) {
      dKey = keys.find((k) => {
        const l = k.toLowerCase().trim();
        return l.includes("تاریخ") || l.includes("date") || l.includes("زمان") || l.includes("time") || l.includes("روز");
      });
    }

    return {
      consultantCol: cKey || keys[0] || "",
      statusCol: sKey || "",
      callTypeCol: tKey || "",
      dateCol: dKey || ""
    };
  };

  // Handle Excel Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFeedbackMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!rawJson || rawJson.length === 0) {
          setFeedbackMessage({ type: "error", text: "فایل اکسل انتخاب‌شده خالی است یا سطری ندارد." });
          setIsProcessing(false);
          return;
        }

        const keys = Object.keys(rawJson[0]);
        setRawExcelRows(rawJson);
        setExcelColumns(keys);

        const detected = autoDetectColumns(keys);
        setMappedConsultantCol(detected.consultantCol);
        setMappedStatusCol(detected.statusCol);
        setMappedCallTypeCol(detected.callTypeCol);
        setMappedDateCol(detected.dateCol);

        setUploadedFileName(file.name);

        try {
          localStorage.setItem("crm_uploaded_raw_excel_rows", JSON.stringify(rawJson));
          localStorage.setItem("crm_uploaded_excel_columns", JSON.stringify(keys));
          localStorage.setItem("crm_map_col_consultant", detected.consultantCol);
          localStorage.setItem("crm_map_col_status", detected.statusCol);
          localStorage.setItem("crm_map_col_call_type", detected.callTypeCol);
          localStorage.setItem("crm_map_col_date", detected.dateCol);
          localStorage.setItem("crm_uploaded_call_filename", file.name);
        } catch {}

        setFeedbackMessage({
          type: "success",
          text: `فایل «${file.name}» با موفقیت بارگذاری شد (${rawJson.length} سطر). ستون‌های داخلی: «${detected.consultantCol}»، وضعیت: «${detected.statusCol}» و نوع تماس: «${detected.callTypeCol || "پیش‌فرض"}» شناسایی گردید.`
        });
      } catch (err: any) {
        console.error("Error parsing excel", err);
        setFeedbackMessage({
          type: "error",
          text: `خطا در بازخوانی فایل اکسل: ${err?.message || "فرمت فایل نامعتبر است"}`
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Convert raw Excel rows to normalized Call Records based on column mappings
  const callRecords = useMemo<RawCallRecord[]>(() => {
    if (!rawExcelRows || rawExcelRows.length === 0) return [];

    const cCol = mappedConsultantCol;
    const sCol = mappedStatusCol;
    const tCol = mappedCallTypeCol;
    const dCol = mappedDateCol;

    return rawExcelRows.map((row, idx) => {
      const rawConsultant = cCol ? row[cCol] : "";
      const rawStatusStr = sCol ? String(row[sCol] || "").trim() : "";
      const rawCallTypeStr = tCol ? String(row[tCol] || "").trim() : "";
      const rawDateVal = dCol ? row[dCol] : "";

      // Extract consultant extension / identifier
      const consultantId = extractExtensionNumber(rawConsultant) || String(rawConsultant || "نامشخص").trim();

      // Normalize Status according to user rules:
      // Answer -> answer
      // No Answer / no answer -> noanswer
      // Busy / busy -> MUST BE COUNTED AS noanswer!
      const statusLower = rawStatusStr.toLowerCase();
      const normStatus = statusLower.replace(/[^a-z0-9\u0600-\u06FF]/gi, ""); // remove spaces, underscores, dashes

      let status: "answer" | "noanswer" | "mistake" = "noanswer";
      let isBusy = false;

      // RULE: Busy must be treated as no answer!
      if (normStatus.includes("busy") || normStatus.includes("اشغال")) {
        status = "noanswer";
        isBusy = true;
      } else if (
        normStatus.includes("noanswer") ||
        normStatus.includes("بیپاسخ") ||
        normStatus.includes("عدمپاسخ") ||
        normStatus === "cancel" ||
        normStatus === "congestion" ||
        normStatus === "failed"
      ) {
        status = "noanswer";
      } else if (
        normStatus.includes("answer") ||
        normStatus.includes("پاسخ") ||
        normStatus.includes("موفق") ||
        normStatus === "ok"
      ) {
        status = "answer";
      } else if (
        normStatus.includes("mistake") ||
        normStatus.includes("اشتباه") ||
        normStatus.includes("خطا") ||
        normStatus.includes("ناموفق") ||
        normStatus === "error" ||
        normStatus === "wrong"
      ) {
        status = "mistake";
      } else {
        status = "noanswer";
      }

      // RULE: Parse Call Type from column `call type`:
      // - "local" (تماس داخلی) -> must be subtracted from successful calls of that agent!
      // - "incoming" (تماس ورودی) -> recognized as inbound call!
      const typeLower = rawCallTypeStr.toLowerCase();
      const normType = typeLower.replace(/[^a-z0-9\u0600-\u06FF]/gi, "");

      let isLocal = false;
      let direction: "inbound" | "outbound" = "outbound";
      let callType = "outbound";

      if (
        normType.includes("local") ||
        normType.includes("داخلی") ||
        normType.includes("internal")
      ) {
        isLocal = true;
        callType = "local";
        direction = "outbound";
      } else if (
        normType.includes("incoming") ||
        normType.includes("inbound") ||
        normType.includes("ورودی") ||
        normType === "in" ||
        statusLower.includes("ورودی")
      ) {
        direction = "inbound";
        callType = "incoming";
      } else {
        direction = "outbound";
        callType = "outbound";
      }

      const { date: callDate, month: callMonth } = normalizeDateString(rawDateVal);

      return {
        id: `call_${idx}_${Date.now()}`,
        consultantId,
        rawConsultantVal: String(rawConsultant || ""),
        direction,
        callType,
        isLocal,
        status,
        rawStatus: rawStatusStr || status,
        isBusy,
        callDate,
        callMonth,
        notes: row["توضیحات"] || row["notes"] || ""
      };
    });
  }, [rawExcelRows, mappedConsultantCol, mappedStatusCol, mappedDateCol, mappedCallTypeCol]);

  // Unique Dates and Months
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(callRecords.map((c) => c.callDate).filter(Boolean)));
    return dates.sort().reverse();
  }, [callRecords]);

  const availableMonths = useMemo(() => {
    const months = Array.from(new Set(callRecords.map((c) => c.callMonth).filter(Boolean)));
    return months.sort().reverse();
  }, [callRecords]);

  // Download Sample Template with columns `from`, `call status`, `call type`, `date`, `to`
  const handleDownloadSampleTemplate = () => {
    const sampleRows = [
      {
        "from": "251", // Mohammad Reza Fathabadi
        "to": "09121196033",
        "call status": "answer",
        "call type": "outbound",
        "date": "2026-06-01",
        "notes": "تماس برقرار و مکالمه موفق با مشتری"
      },
      {
        "from": "251",
        "to": "09121523005",
        "call status": "no answer",
        "call type": "outbound",
        "date": "2026-06-01",
        "notes": "عدم پاسخگویی مشتری"
      },
      {
        "from": "251",
        "to": "09122703668",
        "call status": "Busy", // Busy is counted as no answer!
        "call type": "outbound",
        "date": "2026-06-01",
        "notes": "بوق اشغال - محاسبه به عنوان no answer"
      },
      {
        "from": "09129901658",
        "to": "251",
        "call status": "answer",
        "call type": "incoming", // incoming is counted as inbound!
        "date": "2026-06-01",
        "notes": "تماس ورودی به داخلی ۲۵۱"
      },
      {
        "from": "251",
        "to": "252",
        "call status": "answer",
        "call type": "local", // local is internal call and SUBTRACTED from successful calls!
        "date": "2026-06-01",
        "notes": "تماس داخلی به مهتاب ناصری (کسر از تماس‌های موفق ۲۵۱)"
      },
      {
        "from": "251",
        "to": "09128889900",
        "call status": "mistake",
        "call type": "outbound",
        "date": "2026-06-01",
        "notes": "شماره اشتباه"
      },
      {
        "from": "101", // Mohandes Hamidi
        "to": "09123456789",
        "call status": "answer",
        "call type": "outbound",
        "date": "2026-06-01",
        "notes": "مشاوره حقوقی"
      },
      {
        "from": "101",
        "to": "102",
        "call status": "answer",
        "call type": "local", // local call
        "date": "2026-06-01",
        "notes": "تماس داخلی حمیدی با کریمی (کسر از موفق)"
      },
      {
        "from": "101",
        "to": "09129876543",
        "call status": "Busy",
        "call type": "outbound",
        "date": "2026-06-01",
        "notes": "اشغال"
      },
      {
        "from": "102", // Dr Karimi
        "to": "09125556677",
        "call status": "answer",
        "call type": "outbound",
        "date": "2026-06-01",
        "notes": "پاسخ موفق"
      },
      {
        "from": "202", // Sara Khosravi
        "to": "09124443322",
        "call status": "no answer",
        "call type": "outbound",
        "date": "2026-06-01",
        "notes": "بی‌پاسخ"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CDR_Call_Report");
    XLSX.writeFile(wb, "قالب_اکسل_مرکز_تماس_from_status_calltype.xlsx");
  };

  // Load Demo Data matching the user's columns
  const handleLoadDemoData = () => {
    const demoRows = [
      { from: "251", to: "09121196033", "call status": "answer", "call type": "outbound", date: "2026-06-01" },
      { from: "251", to: "09121523005", "call status": "no answer", "call type": "outbound", date: "2026-06-01" },
      { from: "251", to: "09122703668", "call status": "Busy", "call type": "outbound", date: "2026-06-01" },
      { from: "09129901658", to: "251", "call status": "answer", "call type": "incoming", date: "2026-06-01" },
      { from: "251", to: "252", "call status": "answer", "call type": "local", date: "2026-06-01" },
      { from: "251", to: "09128889900", "call status": "mistake", "call type": "outbound", date: "2026-06-01" },
      { from: "101", to: "09123456789", "call status": "answer", "call type": "outbound", date: "2026-06-01" },
      { from: "101", to: "102", "call status": "answer", "call type": "local", date: "2026-06-01" },
      { from: "101", to: "09129876543", "call status": "Busy", "call type": "outbound", date: "2026-06-01" },
      { from: "102", to: "09125556677", "call status": "answer", "call type": "outbound", date: "2026-06-01" },
      { from: "202", to: "09124443322", "call status": "no answer", "call type": "outbound", date: "2026-06-01" }
    ];

    const keys = ["from", "to", "call status", "call type", "date"];
    setRawExcelRows(demoRows);
    setExcelColumns(keys);
    setMappedConsultantCol("from");
    setMappedStatusCol("call status");
    setMappedCallTypeCol("call type");
    setMappedDateCol("date");
    setUploadedFileName("نمونه_تماس_from_status_calltype.xlsx");

    try {
      localStorage.setItem("crm_uploaded_raw_excel_rows", JSON.stringify(demoRows));
      localStorage.setItem("crm_uploaded_excel_columns", JSON.stringify(keys));
      localStorage.setItem("crm_map_col_consultant", "from");
      localStorage.setItem("crm_map_col_status", "call status");
      localStorage.setItem("crm_map_col_call_type", "call type");
      localStorage.setItem("crm_map_col_date", "date");
      localStorage.setItem("crm_uploaded_call_filename", "نمونه_تماس_from_status_calltype.xlsx");
    } catch {}

    setFeedbackMessage({
      type: "success",
      text: "داده‌های آزمایشی استاندارد با ستون‌های from (داخلی ۲۵۱)، call status (شامل answer، no answer و Busy) و call type (شامل incoming و local کسرشونده) بارگذاری شدند."
    });
  };

  // Clear current data
  const handleClearData = () => {
    setRawExcelRows([]);
    setExcelColumns([]);
    setUploadedFileName("");
    localStorage.removeItem("crm_uploaded_raw_excel_rows");
    localStorage.removeItem("crm_uploaded_excel_columns");
    localStorage.removeItem("crm_map_col_consultant");
    localStorage.removeItem("crm_map_col_status");
    localStorage.removeItem("crm_map_col_call_type");
    localStorage.removeItem("crm_map_col_direction");
    localStorage.removeItem("crm_map_col_date");
    localStorage.removeItem("crm_uploaded_call_filename");
    setFeedbackMessage({ type: "info", text: "فایل و گزارش فعلی پاک‌سازی شد." });
  };

  // MAIN REPORT CALCULATIONS: Cumulative, Daily, Monthly
  const processedReports = useMemo<ConsultantReportItem[]>(() => {
    if (callRecords.length === 0) return [];

    const fieldKey = (priceFieldRef || "price") as keyof Lead;

    const calculateAgentItem = (
      cid: string,
      calls: RawCallRecord[],
      periodLabel?: string,
      filterDateExact?: string,
      filterMonthExact?: string
    ): ConsultantReportItem => {
      const resolved = resolveConsultant(cid);

      const totalCallsMade = calls.filter((c) => c.direction === "outbound" || c.isLocal).length || calls.length;
      const inboundCalls = calls.filter((c) => c.direction === "inbound" || c.callType === "incoming").length;
      const localCalls = calls.filter((c) => c.isLocal || c.callType === "local").length;
      const answeredCalls = calls.filter((c) => c.status === "answer").length;
      // NoAnswer calls INCLUDES busy calls!
      const noAnswerCalls = calls.filter((c) => c.status === "noanswer").length;
      const busyCallsCount = calls.filter((c) => c.isBusy).length;
      const mistakeCalls = calls.filter((c) => c.status === "mistake").length;

      // Extract unique dates for this agent's calls in this group
      const agentCallDates = Array.from(new Set(calls.map((c) => c.callDate).filter(Boolean)));

      // RULE: Divar Leads MUST be read from BOTH leads AND opportunities on the SAME DATE
      const matchingDivarRecords = leads.filter((l) => {
        if (!isLeadFromDivar(l)) return false;

        const belongs = doesLeadBelongToAgent(l, cid, resolved.id, resolved.name, resolved.extension);
        if (!belongs) return false;

        const leadDate = (l.created_at || "").slice(0, 10);
        const leadMonth = (l.created_at || "").slice(0, 7);

        if (filterDateExact) {
          return leadDate === filterDateExact;
        } else if (filterMonthExact) {
          return leadMonth === filterMonthExact;
        } else {
          return agentCallDates.length > 0 ? agentCallDates.includes(leadDate) : true;
        }
      });

      const divarRawLeadsCount = matchingDivarRecords.filter((r) => r.module_type === "lead").length;
      const divarOppsCount = matchingDivarRecords.filter((r) => r.module_type === "opportunity").length;
      const divarLeadsCount = matchingDivarRecords.length;

      // RULE: Successful calls = (Answer + Divar Leads) - Local Calls (تماس‌های داخلی)
      const totalSuccessfulCalls = Math.max(0, answeredCalls + divarLeadsCount - localCalls);
      const totalCalls = calls.length;
      const callSuccessRate = totalCalls > 0 ? Math.min(100, Math.round((totalSuccessfulCalls / totalCalls) * 100)) : 0;

      // CRM Sales & Cash Metrics from won opportunities
      const wonRecords = leads.filter((l) => {
        const isOpp = l.module_type === "opportunity";
        const isWon = l.opportunity_status === (wonStatusRef || "ost_4");
        if (!isOpp || !isWon) return false;

        const belongs = doesLeadBelongToAgent(l, cid, resolved.id, resolved.name, resolved.extension);
        if (!belongs) return false;

        const dateStr = (l.converted_at || l.created_at || "").slice(0, 10);
        const monthStr = dateStr.slice(0, 7);

        if (filterDateExact) {
          return dateStr === filterDateExact;
        } else if (filterMonthExact) {
          return monthStr === filterMonthExact;
        }
        return true;
      });

      const totalSalesVolume = wonRecords.reduce((sum, item) => {
        const p = Number(item[fieldKey] ?? item.price ?? 0);
        return sum + p;
      }, 0);

      const cashRecords = wonRecords.filter((l) => {
        if (!l.payment_type) return false;
        if (l.payment_type === "pty_1") return true;
        const pLabel = getBadgeLabel(l.payment_type);
        return pLabel.includes("نقدی") || l.payment_type.toLowerCase().includes("cash");
      });

      const cashSalesVolume = cashRecords.reduce((sum, item) => {
        const p = Number(item[fieldKey] ?? item.price ?? 0);
        return sum + p;
      }, 0);

      const totalSalesCount = wonRecords.length;
      const cashSalesCount = cashRecords.length;

      return {
        consultantIdentifier: cid,
        consultantName: resolved.name,
        consultantExtension: resolved.extension,
        matchedId: resolved.id,
        periodLabel,
        totalCallsMade,
        inboundCalls,
        localCalls,
        answeredCalls,
        noAnswerCalls,
        busyCallsCount,
        mistakeCalls,
        divarRawLeadsCount,
        divarOppsCount,
        divarLeadsCount,
        matchingDivarRecords,
        totalSuccessfulCalls,
        callSuccessRate,
        totalSalesVolume,
        cashSalesVolume,
        totalSalesCount,
        cashSalesCount,
        wonRecords
      };
    };

    // 1. CUMULATIVE MODE
    if (reportViewMode === "cumulative") {
      const groups: { [cid: string]: RawCallRecord[] } = {};
      callRecords.forEach((c) => {
        const cid = c.consultantId || "نامشخص";
        if (!groups[cid]) groups[cid] = [];
        groups[cid].push(c);
      });

      return Object.keys(groups).map((cid) => {
        return calculateAgentItem(cid, groups[cid], "تجمیعی کلی");
      });
    }

    // 2. DAILY MODE
    if (reportViewMode === "daily") {
      const activeCalls = dailySelectedDate === "all"
        ? callRecords
        : callRecords.filter((c) => c.callDate === dailySelectedDate);

      const groups: { [key: string]: { date: string; cid: string; calls: RawCallRecord[] } } = {};
      activeCalls.forEach((c) => {
        const key = `${c.callDate}_${c.consultantId}`;
        if (!groups[key]) {
          groups[key] = { date: c.callDate, cid: c.consultantId, calls: [] };
        }
        groups[key].calls.push(c);
      });

      return Object.values(groups)
        .map((g) => calculateAgentItem(g.cid, g.calls, g.date, g.date))
        .sort((a, b) => (b.periodLabel || "").localeCompare(a.periodLabel || ""));
    }

    // 3. MONTHLY MODE
    if (reportViewMode === "monthly") {
      const activeCalls = monthlySelectedMonth === "all"
        ? callRecords
        : callRecords.filter((c) => c.callMonth === monthlySelectedMonth);

      const groups: { [key: string]: { month: string; cid: string; calls: RawCallRecord[] } } = {};
      activeCalls.forEach((c) => {
        const key = `${c.callMonth}_${c.consultantId}`;
        if (!groups[key]) {
          groups[key] = { month: c.callMonth, cid: c.consultantId, calls: [] };
        }
        groups[key].calls.push(c);
      });

      return Object.values(groups)
        .map((g) => calculateAgentItem(g.cid, g.calls, g.month, undefined, g.month))
        .sort((a, b) => (b.periodLabel || "").localeCompare(a.periodLabel || ""));
    }

    return [];
  }, [
    callRecords,
    reportViewMode,
    dailySelectedDate,
    monthlySelectedMonth,
    leads,
    dropdowns,
    wonStatusRef,
    priceFieldRef
  ]);

  // Filtered by Search input
  const filteredReports = useMemo(() => {
    if (!searchFilter.trim()) return processedReports;
    const q = searchFilter.toLowerCase().trim();
    return processedReports.filter(
      (r) =>
        r.consultantIdentifier.toLowerCase().includes(q) ||
        r.consultantName.toLowerCase().includes(q) ||
        (r.consultantExtension && r.consultantExtension.includes(q))
    );
  }, [processedReports, searchFilter]);

  // Organization Totals
  const totals = useMemo(() => {
    return filteredReports.reduce(
      (acc, curr) => ({
        totalCallsMade: acc.totalCallsMade + curr.totalCallsMade,
        inboundCalls: acc.inboundCalls + curr.inboundCalls,
        localCalls: acc.localCalls + curr.localCalls,
        answeredCalls: acc.answeredCalls + curr.answeredCalls,
        noAnswerCalls: acc.noAnswerCalls + curr.noAnswerCalls,
        busyCallsCount: acc.busyCallsCount + curr.busyCallsCount,
        mistakeCalls: acc.mistakeCalls + curr.mistakeCalls,
        divarLeadsCount: acc.divarLeadsCount + curr.divarLeadsCount,
        totalSuccessfulCalls: acc.totalSuccessfulCalls + curr.totalSuccessfulCalls,
        totalSalesVolume: acc.totalSalesVolume + curr.totalSalesVolume,
        cashSalesVolume: acc.cashSalesVolume + curr.cashSalesVolume,
        totalSalesCount: acc.totalSalesCount + curr.totalSalesCount,
        cashSalesCount: acc.cashSalesCount + curr.cashSalesCount
      }),
      {
        totalCallsMade: 0,
        inboundCalls: 0,
        localCalls: 0,
        answeredCalls: 0,
        noAnswerCalls: 0,
        busyCallsCount: 0,
        mistakeCalls: 0,
        divarLeadsCount: 0,
        totalSuccessfulCalls: 0,
        totalSalesVolume: 0,
        cashSalesVolume: 0,
        totalSalesCount: 0,
        cashSalesCount: 0
      }
    );
  }, [filteredReports]);

  // Export to Excel (.xlsx)
  const handleExportToExcel = () => {
    if (filteredReports.length === 0) {
      alert("هیچ رکوردی برای خروجی گرفتن وجود ندارد.");
      return;
    }

    const exportRows = filteredReports.map((r, index) => ({
      "ردیف": index + 1,
      "بازه زمانی": r.periodLabel || "تجمیعی",
      "داخلی (from)": r.consultantExtension || r.consultantIdentifier,
      "نام کارشناس": r.consultantName,
      "تماس‌های برقرار شده": r.totalCallsMade,
      "تماس‌های ورودی (incoming)": r.inboundCalls,
      "Answer (پاسخ)": r.answeredCalls,
      "NoAnswer (بی‌پاسخ + Busy)": r.noAnswerCalls,
      "تعداد Busy": r.busyCallsCount,
      "تماس‌های داخلی (Local - کسر از موفق)": r.localCalls,
      "Mistake (اشتباه)": r.mistakeCalls,
      "لیدهای دیوار (سرنخ+فرصت)": r.divarLeadsCount,
      "مجموع تماس‌های موفق [(Answer+دیوار) - Local]": r.totalSuccessfulCalls,
      "درصد موفقیت": `${r.callSuccessRate}%`,
      "مبلغ کل فروش (تومان)": r.totalSalesVolume,
      "مبلغ فروش نقدی (تومان)": r.cashSalesVolume,
      "تعداد کل فروش": r.totalSalesCount,
      "تعداد پرداخت نقدی": r.cashSalesCount
    }));

    // Add totals row at bottom
    exportRows.push({
      "ردیف": "مجموع کل",
      "بازه زمانی": "کل سازمان",
      "داخلی (from)": "---",
      "نام کارشناس": "کل سازمان",
      "تماس‌های برقرار شده": totals.totalCallsMade,
      "تماس‌های ورودی (incoming)": totals.inboundCalls,
      "Answer (پاسخ)": totals.answeredCalls,
      "NoAnswer (بی‌پاسخ + Busy)": totals.noAnswerCalls,
      "تعداد Busy": totals.busyCallsCount,
      "تماس‌های داخلی (Local - کسر از موفق)": totals.localCalls,
      "Mistake (اشتباه)": totals.mistakeCalls,
      "لیدهای دیوار (سرنخ+فرصت)": totals.divarLeadsCount,
      "مجموع تماس‌های موفق [(Answer+دیوار) - Local]": totals.totalSuccessfulCalls,
      "درصد موفقیت": `${totals.totalCallsMade > 0 ? Math.round((totals.totalSuccessfulCalls / totals.totalCallsMade) * 100) : 0}%`,
      "مبلغ کل فروش (تومان)": totals.totalSalesVolume,
      "مبلغ فروش نقدی (تومان)": totals.cashSalesVolume,
      "تعداد کل فروش": totals.totalSalesCount,
      "تعداد پرداخت نقدی": totals.cashSalesCount
    } as any);

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    const sheetTitle = reportViewMode === "cumulative" ? "تجمیعی" : reportViewMode === "daily" ? "روزانه" : "ماهانه";
    XLSX.utils.book_append_sheet(wb, ws, `گزارش_${sheetTitle}`);
    XLSX.writeFile(wb, `گزارش_عملکرد_مرکز_تماس_و_فروش_${sheetTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Block unauthorized roles
  if (!hasAccess) {
    return (
      <div className="glass-panel p-10 rounded-2xl border border-rose-500/20 text-center space-y-3" dir="rtl">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
        <h3 className="text-base font-extrabold text-rose-400">عدم دسترسی به بخش گزارش‌گیری</h3>
        <p className="text-xs text-slate-300 max-w-md mx-auto">
          این بخش منحصراً برای مدیر ارشد، سرپرست مرکز تماس و توسعه‌دهنده سیستم فعال است و سایر پرسنل اجازه مشاهده ندارند.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right animate-fadeIn" dir="rtl" id="call-reports-dashboard">
      
      {/* Top Banner and Actions */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 text-teal-400 rounded-xl border border-teal-500/20 shadow">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>سامانه هوشمند گزارش‌گیری مرکز تماس و فروش</span>
                <span className="text-[10px] bg-teal-500/15 text-teal-300 font-bold px-2.5 py-0.5 rounded-full border border-teal-500/30">
                  PBX & Sales Analytics
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                تطبیق خودکار ستون <strong className="text-teal-300 font-mono">from</strong> (داخلی)، ستون <strong className="text-teal-300 font-mono">call status</strong> (محاسبه Busy در NoAnswer) و ستون <strong className="text-teal-300 font-mono">call type</strong> (تشخیص incoming ورودی و کسر local داخلی از موفق) + لیدهای دیوار
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadSampleTemplate}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 flex items-center gap-1.5 transition cursor-pointer"
            title="دانلود قالب اکسل با ستون‌های from، call status و call type"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>قالب نمونه (from، status و call type)</span>
          </button>

          {rawExcelRows.length === 0 && (
            <button
              onClick={handleLoadDemoData}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition cursor-pointer"
              title="بارگذاری نمونه تستی با ستون from (داخلی ۲۵۱)، call status (با Busy) و call type (با local و incoming)"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>بارگذاری داده آزمایشی (from = 251)</span>
            </button>
          )}

          {rawExcelRows.length > 0 && (
            <>
              <button
                onClick={() => setShowColumnMapping(!showColumnMapping)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                  showColumnMapping
                    ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10"
                }`}
                title="مشاهده و تغییر ستون‌های تطبیق داده شده اکسل"
              >
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                <span>تنظیم ستون‌ها</span>
              </button>

              <button
                onClick={handleExportToExcel}
                className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition cursor-pointer"
                title="دانلود فایل اکسل گزارش فعلی"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>خروجی اکسل گزارش (.xlsx)</span>
              </button>

              <button
                onClick={handleClearData}
                className="px-2.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 flex items-center gap-1 transition cursor-pointer"
                title="حذف فایل فعلی"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>پاک‌سازی</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs: Cumulative, Daily, Monthly */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-2 rounded-2xl border border-white/10">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setReportViewMode("cumulative")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              reportViewMode === "cumulative"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-teal-400" />
            <span>گزارش تجمیعی کلی (همه کارشناسان)</span>
          </button>

          <button
            onClick={() => setReportViewMode("daily")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              reportViewMode === "daily"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>گزارش روزانه (Daily Breakdown)</span>
          </button>

          <button
            onClick={() => setReportViewMode("monthly")}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
              reportViewMode === "monthly"
                ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CalendarDays className="w-4 h-4 text-purple-400" />
            <span>گزارش ماهانه (Monthly Breakdown)</span>
          </button>
        </div>

        {/* View-specific Filter Pickers */}
        <div className="flex items-center gap-2">
          {reportViewMode === "daily" && availableDates.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs">
              <span className="text-slate-400 font-bold">انتخاب روز:</span>
              <select
                value={dailySelectedDate}
                onChange={(e) => setDailySelectedDate(e.target.value)}
                className="bg-transparent text-teal-300 font-mono font-bold cursor-pointer outline-none"
              >
                <option value="all">تمام روزها (جدول تفکیک روز به روز)</option>
                {availableDates.map((d) => (
                  <option key={d} value={d} className="bg-slate-950 text-white">
                    روز {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportViewMode === "monthly" && availableMonths.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-white/10 text-xs">
              <span className="text-slate-400 font-bold">انتخاب ماه:</span>
              <select
                value={monthlySelectedMonth}
                onChange={(e) => setMonthlySelectedMonth(e.target.value)}
                className="bg-transparent text-teal-300 font-mono font-bold cursor-pointer outline-none"
              >
                <option value="all">تمام ماه‌ها (تفکیک ماه به ماه)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m} className="bg-slate-950 text-white">
                    ماه {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search box */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجوی نام یا داخلی..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 pr-9 pl-3 py-1.5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>
        </div>
      </div>

      {/* Interactive Column Mapping Panel (Shows when toggled or on demand) */}
      {(showColumnMapping || rawExcelRows.length > 0) && excelColumns.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl border border-teal-500/20 bg-teal-500/[0.02] space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-xs font-black text-teal-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-teal-400" />
              <span>ستون‌های تطبیق داده شده از فایل اکسل (Column Mapping)</span>
            </span>
            <span className="text-[10px] text-slate-400">
              تطبیق خودکار ستون <strong className="text-white font-mono">from</strong> (داخلی)، ستون <strong className="text-white font-mono">call status</strong> (وضعیت) و ستون <strong className="text-white font-mono">call type</strong> (نوع تماس)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Consultant Column */}
            <div>
              <label className="block text-[10px] text-teal-300 font-bold mb-1">
                ستون داخلی کارشناس (from):
              </label>
              <select
                value={mappedConsultantCol}
                onChange={(e) => {
                  setMappedConsultantCol(e.target.value);
                  localStorage.setItem("crm_map_col_consultant", e.target.value);
                }}
                className="w-full bg-slate-950 border border-teal-500/30 p-2 rounded-xl text-teal-200 font-mono font-bold cursor-pointer"
              >
                {excelColumns.map((col) => (
                  <option key={col} value={col}>
                    {col} {col.toLowerCase().trim() === "from" ? "★ (ستون اصلی)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Column */}
            <div>
              <label className="block text-[10px] text-teal-300 font-bold mb-1">
                ستون وضعیت تماس (call status):
              </label>
              <select
                value={mappedStatusCol}
                onChange={(e) => {
                  setMappedStatusCol(e.target.value);
                  localStorage.setItem("crm_map_col_status", e.target.value);
                }}
                className="w-full bg-slate-950 border border-teal-500/30 p-2 rounded-xl text-teal-200 font-mono font-bold cursor-pointer"
              >
                {excelColumns.map((col) => (
                  <option key={col} value={col}>
                    {col} {col.toLowerCase().trim() === "call status" ? "★ (وضعیت اصلی)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Call Type Column */}
            <div>
              <label className="block text-[10px] text-teal-300 font-bold mb-1">
                ستون نوع/جهت تماس (call type / incoming / local):
              </label>
              <select
                value={mappedCallTypeCol}
                onChange={(e) => {
                  setMappedCallTypeCol(e.target.value);
                  localStorage.setItem("crm_map_col_call_type", e.target.value);
                }}
                className="w-full bg-slate-950 border border-teal-500/30 p-2 rounded-xl text-teal-200 font-mono font-bold cursor-pointer"
              >
                <option value="">-- بدون ستون نوع تماس (پیش‌فرض: خروجی) --</option>
                {excelColumns.map((col) => (
                  <option key={col} value={col}>
                    {col} {col.toLowerCase().trim() === "call type" || col.toLowerCase().trim() === "call_type" ? "★ (نوع تماس)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Column */}
            <div>
              <label className="block text-[10px] text-slate-300 font-semibold mb-1">
                ستون تاریخ تماس (date / calldate):
              </label>
              <select
                value={mappedDateCol}
                onChange={(e) => {
                  setMappedDateCol(e.target.value);
                  localStorage.setItem("crm_map_col_date", e.target.value);
                }}
                className="w-full bg-slate-950 border border-white/10 p-2 rounded-xl text-slate-200 font-mono cursor-pointer"
              >
                <option value="">-- بدون ستون تاریخ --</option>
                {excelColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Formula & Rule Note */}
      <div className="p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20 text-teal-200 text-xs flex items-center gap-3">
        <Info className="w-5 h-5 text-teal-400 shrink-0" />
        <div className="leading-relaxed">
          <strong className="text-teal-300 font-extrabold">قوانین محاسبه گزارش مرکز تماس: </strong>
          در ستون <span className="font-mono bg-teal-500/20 px-1.5 py-0.5 rounded text-white font-bold">call status</span> مقادیر <strong className="text-white">answer</strong> به عنوان پاسخ و مقادیر <strong className="text-white">no answer</strong> و <strong className="text-amber-300">Busy (اشغال)</strong> به عنوان بی‌پاسخ (NoAnswer) لحاظ می‌شوند.
          در ستون <span className="font-mono bg-teal-500/20 px-1.5 py-0.5 rounded text-white font-bold">call type</span> مقدار <strong className="text-cyan-300">incoming</strong> به عنوان تماس ورودی و مقدار <strong className="text-rose-300">local</strong> به عنوان تماس داخلی شناسایی شده و از تعداد تماس‌های موفق کسر می‌گردد.
          فرمول نهایی تماس موفق:{" "}
          <span className="bg-teal-500/25 text-white px-2 py-0.5 rounded font-mono font-bold mx-1 border border-teal-500/40">
            (Answer + لیدهای دیوار همان روز) - تماس‌های داخلی (Local)
          </span>
          .
        </div>
      </div>

      {/* Upload Zone */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>بارگذاری فایل اکسل مرکز تماس با ستون‌های from و call status</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              فایل حاوی ستون <span className="font-mono text-teal-300">from</span> (داخلی ۲۵۱ و...) و <span className="font-mono text-teal-300">call status</span> (Answer, NoAnswer, Busy) را انتخاب یا اینجا رها کنید:
            </p>
          </div>

          {uploadedFileName && (
            <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 font-mono">{uploadedFileName}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                {rawExcelRows.length} رکورد
              </span>
            </div>
          )}
        </div>

        {/* Hidden native input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileUpload}
          className="hidden"
          id="call-records-excel-input"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/15 hover:border-teal-500/50 bg-slate-950/40 hover:bg-slate-900/40 transition-all rounded-xl p-5 text-center cursor-pointer group"
        >
          <div className="w-10 h-10 mx-auto rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-xs font-extrabold text-slate-200">
            برای انتخاب فایل اکسل تماس‌ها کلیک کنید یا فایل را اینجا رها کنید
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            پشتیبانی کامل از فایل‌های خروجی ایزابل/استریسک با ستون from و وضعیت‌های Answer / No Answer / Busy
          </p>
        </div>

        {feedbackMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              feedbackMessage.type === "success"
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                : feedbackMessage.type === "error"
                ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
            }`}
          >
            {feedbackMessage.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {feedbackMessage.type === "error" && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {feedbackMessage.type === "info" && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
            <span>{feedbackMessage.text}</span>
          </div>
        )}
      </div>

      {/* Aggregate KPI Summary Cards */}
      {callRecords.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Card 1: Outbound */}
          <div className="glass-panel p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] text-slate-400 font-semibold block mb-1">تماس‌های برقرار شده</span>
            <p className="text-xl font-black text-slate-100 font-mono tracking-tight">
              {totals.totalCallsMade.toLocaleString("fa-IR")}
            </p>
            <span className="text-[9px] text-slate-500 mt-1">خروجی کارشناسان</span>
          </div>

          {/* Card 2: Inbound */}
          <div className="glass-panel p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] text-cyan-400 font-semibold block mb-1">تماس‌های ورودی (incoming)</span>
            <p className="text-xl font-black text-cyan-400 font-mono tracking-tight">
              {totals.inboundCalls.toLocaleString("fa-IR")}
            </p>
            <span className="text-[9px] text-slate-500 mt-1">دریافت شده از مشتریان</span>
          </div>

          {/* Card 3: Local Calls (Subtracted from Successful calls) */}
          <div className="glass-panel p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/[0.02] flex flex-col justify-between">
            <span className="text-[10px] text-purple-300 font-semibold block mb-1">تماس‌های داخلی (Local)</span>
            <p className="text-xl font-black text-purple-400 font-mono tracking-tight">
              {totals.localCalls.toLocaleString("fa-IR")}
            </p>
            <span className="text-[9px] text-purple-400/80 mt-1">کسر از تماس‌های موفق</span>
          </div>

          {/* Card 4: Answer */}
          <div className="glass-panel p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] text-emerald-400 font-semibold block mb-1">تماس‌های Answer</span>
            <p className="text-xl font-black text-emerald-400 font-mono tracking-tight">
              {totals.answeredCalls.toLocaleString("fa-IR")}
            </p>
            <span className="text-[9px] text-slate-500 mt-1">مکالمه موفق برقرار شده</span>
          </div>

          {/* Card 5: NoAnswer + Busy */}
          <div className="glass-panel p-3.5 rounded-xl border border-white/5 flex flex-col justify-between">
            <span className="text-[10px] text-rose-400 font-semibold block mb-1">بی‌پاسخ (NoAnswer + Busy)</span>
            <p className="text-xl font-black text-rose-400 font-mono tracking-tight">
              {totals.noAnswerCalls.toLocaleString("fa-IR")}
            </p>
            <span className="text-[9px] text-slate-500 mt-1">
              شامل {totals.busyCallsCount} تماس Busy
            </span>
          </div>

          {/* Card 6: Divar Leads (Both leads & opps) */}
          <div className="glass-panel p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] flex flex-col justify-between">
            <span className="text-[10px] text-amber-300 font-bold block mb-1">لیدهای دیوار (سرنخ+فرصت)</span>
            <p className="text-xl font-black text-amber-400 font-mono tracking-tight">
              {totals.divarLeadsCount.toLocaleString("fa-IR")}
            </p>
            <span className="text-[9px] text-amber-500/80 mt-1">ثبت هم‌زمان در تاریخ روز</span>
          </div>

          {/* Card 7: Total Successful Calls ⭐ */}
          <div className="glass-panel p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] flex flex-col justify-between shadow-lg shadow-emerald-500/10">
            <span className="text-[10px] text-emerald-300 font-bold block mb-1 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>کل تماس‌های موفق ⭐</span>
            </span>
            <p className="text-2xl font-black text-emerald-300 font-mono tracking-tight">
              {totals.totalSuccessfulCalls.toLocaleString("fa-IR")}
            </p>
            <span className="text-[9px] text-emerald-400 font-semibold mt-1">(Answer + دیوار) - Local</span>
          </div>
        </div>
      )}

      {/* Main Table: Breakdown per Consultant */}
      {callRecords.length > 0 ? (
        <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden shadow-xl" id="consultant-report-table-card">
          <div className="p-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-400" />
                <span>
                  {reportViewMode === "cumulative"
                    ? "گزارش تجمیعی کلی کارشناسان"
                    : reportViewMode === "daily"
                    ? "گزارش روزانه کارشناسان (Daily Performance)"
                    : "گزارش ماهانه کارشناسان (Monthly Performance)"}
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  ({filteredReports.length} سطر)
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                کلیک روی هر سطر، جزئیات لیدهای دیوار (سرنخ و فرصت) و پرونده‌های فروش و نقدی را باز می‌کند.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-400">
                مبلغ کل فروش: <strong className="text-emerald-400">{totals.totalSalesVolume.toLocaleString("fa-IR")} تومان</strong>
              </span>
              <span className="text-slate-400">
                فروش نقدی: <strong className="text-teal-400">{totals.cashSalesVolume.toLocaleString("fa-IR")} تومان</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-900/60 border-b border-white/5 text-slate-400 text-[11px] font-bold select-none">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  {(reportViewMode === "daily" || reportViewMode === "monthly") && (
                    <th className="py-3 px-3 text-center">بازه زمانی</th>
                  )}
                  <th className="py-3 px-3 text-center w-24">داخلی (from)</th>
                  <th className="py-3 px-3">نام و پرونده کارشناس</th>
                  <th className="py-3 px-3 text-center">تماس برقرار شده</th>
                  <th className="py-3 px-3 text-center text-cyan-400">ورودی (incoming)</th>
                  <th className="py-3 px-3 text-center text-emerald-400">Answer</th>
                  <th className="py-3 px-3 text-center text-rose-300">NoAnswer + Busy</th>
                  <th className="py-3 px-3 text-center text-purple-300">تماس داخلی (Local)</th>
                  <th className="py-3 px-3 text-center text-amber-400">لید دیوار (سرنخ+فرصت)</th>
                  <th className="py-3 px-3 text-center text-emerald-300 font-black bg-emerald-500/10">
                    تماس موفق ⭐
                  </th>
                  <th className="py-3 px-3 text-center">درصد موفقیت</th>
                  <th className="py-3 px-3 text-left">مبلغ کل فروش (تومان)</th>
                  <th className="py-3 px-3 text-left text-teal-300">مبلغ فروش نقدی (تومان)</th>
                  <th className="py-3 px-3 text-center">تعداد کل فروش</th>
                  <th className="py-3 px-3 text-center">تعداد نقدی</th>
                  <th className="py-3 px-3 text-center w-12">جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredReports.map((row, idx) => {
                  const rowKey = `${row.consultantIdentifier}_${row.periodLabel || idx}`;
                  const isExpanded = expandedRowKey === rowKey;

                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        onClick={() => setExpandedRowKey(isExpanded ? null : rowKey)}
                        className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${
                          isExpanded ? "bg-white/[0.04]" : ""
                        }`}
                      >
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        {(reportViewMode === "daily" || reportViewMode === "monthly") && (
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                            {row.periodLabel}
                          </td>
                        )}
                        <td className="py-3 px-3 text-center font-mono">
                          <span className="bg-teal-500/15 text-teal-300 px-2.5 py-1 rounded-lg border border-teal-500/30 font-black text-xs">
                            {row.consultantExtension || row.consultantIdentifier}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-200">{row.consultantName}</div>
                          {row.consultantExtension && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              شناسه داخلی: {row.consultantExtension}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                          {row.totalCallsMade.toLocaleString("fa-IR")}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-cyan-400">
                          {row.inboundCalls > 0 ? row.inboundCalls.toLocaleString("fa-IR") : "-"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                          {row.answeredCalls.toLocaleString("fa-IR")}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-rose-300">
                          <span>{row.noAnswerCalls.toLocaleString("fa-IR")}</span>
                          {row.busyCallsCount > 0 && (
                            <span className="block text-[9px] text-amber-400/90 font-sans">
                              ({row.busyCallsCount} اشغال)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-purple-300">
                          {row.localCalls > 0 ? (
                            <span className="bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-lg border border-purple-500/20" title="تماس داخلی - کسر شده از تماس‌های موفق">
                              -{row.localCalls}
                            </span>
                          ) : (
                            <span className="text-slate-600">۰</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-amber-400">
                          {row.divarLeadsCount > 0 ? (
                            <span className="bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20" title={`سرنخ‌ها: ${row.divarRawLeadsCount} | فرصت‌ها: ${row.divarOppsCount}`}>
                              +{row.divarLeadsCount}
                            </span>
                          ) : (
                            <span className="text-slate-600">۰</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-emerald-300 text-sm bg-emerald-500/10">
                          <span className="bg-emerald-500/20 text-emerald-200 px-2.5 py-1 rounded-xl border border-emerald-500/30 inline-block shadow-sm" title="(Answer + لیدهای دیوار) - Local">
                            {row.totalSuccessfulCalls.toLocaleString("fa-IR")}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              row.callSuccessRate >= 50
                                ? "bg-emerald-500/15 text-emerald-300"
                                : row.callSuccessRate >= 25
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            %{row.callSuccessRate}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-left font-mono font-black text-slate-100">
                          {row.totalSalesVolume > 0 ? row.totalSalesVolume.toLocaleString("fa-IR") : "-"}
                        </td>
                        <td className="py-3 px-3 text-left font-mono font-bold text-teal-300">
                          {row.cashSalesVolume > 0 ? row.cashSalesVolume.toLocaleString("fa-IR") : "-"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-purple-400">
                          {row.totalSalesCount > 0 ? row.totalSalesCount.toLocaleString("fa-IR") : "۰"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-teal-400">
                          {row.cashSalesCount > 0 ? row.cashSalesCount.toLocaleString("fa-IR") : "۰"}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                        </td>
                      </tr>

                      {/* Expandable Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/70 border-b border-white/5">
                          <td colSpan={(reportViewMode === "daily" || reportViewMode === "monthly") ? 17 : 16} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left: Divar Leads & Opportunities */}
                              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-amber-500/20 space-y-2">
                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    <span>
                                      لیدهای دیوار: {row.divarLeadsCount} عدد ({row.divarRawLeadsCount} سرنخ خام + {row.divarOppsCount} فرصت معامله)
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-amber-400/80">محاسبه در تماس موفق</span>
                                </div>
                                {row.matchingDivarRecords.length === 0 ? (
                                  <p className="text-[11px] text-slate-500 py-2">
                                    هیچ لیدی با منبع دیوار و تاریخ متناظر در پایگاه داده برای این کارشناس یافت نشد.
                                  </p>
                                ) : (
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {row.matchingDivarRecords.map((dl) => (
                                      <div
                                        key={dl.id}
                                        className="bg-slate-950/80 p-2 rounded-lg border border-white/5 flex items-center justify-between text-[11px]"
                                      >
                                        <div>
                                          <span className="font-bold text-slate-200">{dl.full_name}</span>
                                          <span className="text-slate-500 text-[10px] mr-2 font-mono">{dl.mobile}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                            dl.module_type === "lead"
                                              ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                              : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                                          }`}>
                                            {dl.module_type === "lead" ? "سرنخ خام" : "فرصت معامله"}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            {dl.created_at?.slice(0, 10)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Right: Won Opportunities & Cash Sales Breakdown */}
                              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-emerald-500/20 space-y-2">
                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>
                                      معاملات برنده و فروش نقدی ({row.totalSalesCount} معامله - نقدی: {row.cashSalesCount})
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    کل: {row.totalSalesVolume.toLocaleString("fa-IR")} | نقدی: {row.cashSalesVolume.toLocaleString("fa-IR")}
                                  </span>
                                </div>
                                {row.wonRecords.length === 0 ? (
                                  <p className="text-[11px] text-slate-500 py-2">
                                    هیچ معامله نهایی‌شده‌ای برای این کارشناس در بازه انتخابی ثبت نشده است.
                                  </p>
                                ) : (
                                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                    {row.wonRecords.map((wl) => {
                                      const isCash = wl.payment_type === "pty_1" || getBadgeLabel(wl.payment_type).includes("نقدی");
                                      return (
                                        <div
                                          key={wl.id}
                                          className="bg-slate-950/80 p-2 rounded-lg border border-white/5 flex items-center justify-between text-[11px]"
                                        >
                                          <div>
                                            <span className="font-bold text-slate-200">{wl.full_name}</span>
                                            <span className="text-emerald-400 font-mono mr-2 font-bold">
                                              {Number(wl.price || 0).toLocaleString("fa-IR")} تومان
                                            </span>
                                          </div>
                                          <div>
                                            {isCash ? (
                                              <span className="bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded text-[9px] border border-emerald-500/20 font-bold">
                                                پرداخت نقدی
                                              </span>
                                            ) : (
                                              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[9px]">
                                                {getBadgeLabel(wl.payment_type) || "اقساطی"}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900/90 border-t border-white/10 font-black text-slate-200">
                <tr>
                  <td colSpan={(reportViewMode === "daily" || reportViewMode === "monthly") ? 4 : 3} className="py-3 px-3 text-right">
                    مجموع کل گزارش:
                  </td>
                  <td className="py-3 px-3 text-center font-mono">{totals.totalCallsMade.toLocaleString("fa-IR")}</td>
                  <td className="py-3 px-3 text-center font-mono text-cyan-400">{totals.inboundCalls.toLocaleString("fa-IR")}</td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-400">{totals.answeredCalls.toLocaleString("fa-IR")}</td>
                  <td className="py-3 px-3 text-center font-mono text-rose-300">
                    <span>{totals.noAnswerCalls.toLocaleString("fa-IR")}</span>
                    {totals.busyCallsCount > 0 && (
                      <span className="block text-[9px] text-amber-400 font-sans">
                        ({totals.busyCallsCount} Busy)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-purple-300">
                    {totals.localCalls > 0 ? `-${totals.localCalls.toLocaleString("fa-IR")}` : "۰"}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-amber-400">+{totals.divarLeadsCount}</td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-300 bg-emerald-500/15 text-sm">
                    {totals.totalSuccessfulCalls.toLocaleString("fa-IR")}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    %{totals.totalCallsMade > 0 ? Math.round((totals.totalSuccessfulCalls / totals.totalCallsMade) * 100) : 0}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-emerald-300">
                    {totals.totalSalesVolume.toLocaleString("fa-IR")}
                  </td>
                  <td className="py-3 px-3 text-left font-mono text-teal-300">
                    {totals.cashSalesVolume.toLocaleString("fa-IR")}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-purple-400">{totals.totalSalesCount}</td>
                  <td className="py-3 px-3 text-center font-mono text-teal-400">{totals.cashSalesCount}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="glass-panel p-10 rounded-2xl border border-white/5 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-200">هنوز فایلی بارگذاری نشده است</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              لطفاً فایل اکسل تماس‌های خود (شامل ستون <span className="font-mono text-teal-300 font-bold">from</span> برای داخلی و <span className="font-mono text-teal-300 font-bold">call status</span>) را بارگذاری کنید یا بر روی دکمه زیر کلیک نمایید.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white cursor-pointer shadow transition"
            >
              انتخاب فایل اکسل
            </button>
            <button
              onClick={handleLoadDemoData}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 cursor-pointer transition"
            >
              مشاهده پیش‌نمایش تستی (from = 251)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
