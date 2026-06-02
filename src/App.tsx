/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { User, Lead, DropdownOption, Notification } from "./types";
import { CRMDatabase } from "./utils/db";

// Components
import AuthScreen from "./components/AuthScreen";
import DropdownManager from "./components/DropdownManager";
import LeadModal from "./components/LeadModal";
import LeadDetailView from "./components/LeadDetailView";
import ExcelImporter from "./components/ExcelImporter";
import ActivityCalendar from "./components/ActivityCalendar";
import AnalysisDashboard from "./components/AnalysisDashboard";
import ManagementPanel from "./components/ManagementPanel";
import InstallmentSales from "./components/InstallmentSales";

// Icons
import {
  Users,
  Briefcase,
  Calendar,
  Layers,
  Upload,
  Search,
  Plus,
  LogOut,
  Bell,
  CheckCircle,
  TrendingUp,
  Clock,
  DollarSign,
  ArrowLeftRight,
  Trash2,
  Edit,
  UserCheck,
  Building,
  Info,
  Star,
  Grid,
  List,
  Sparkles,
  Filter,
  PieChart,
  Scale,
  Settings,
  XCircle,
  Check
} from "lucide-react";

export default function App() {
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [activeModule, setActiveModule] = useState<"leads" | "opportunities" | "calendar" | "dropdowns" | "import" | "analysis" | "management" | "installments">("leads");

  // Database lists
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dropdowns, setDropdowns] = useState<DropdownOption[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // View state (List vs Card) - default is "list" matching user image request
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  
  // Row selection state for ERP batch operations
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [referralFilter, setReferralFilter] = useState<string>("all");

  // Specific Columns Search Inputs
  const [colFilterCreated, setColFilterCreated] = useState("");
  const [colFilterModified, setColFilterModified] = useState("");
  const [colFilterName, setColFilterName] = useState("");
  const [colFilterReferral, setColFilterReferral] = useState("");
  const [colFilterMobile, setColFilterMobile] = useState("");
  const [colFilterSource, setColFilterSource] = useState("");
  const [colFilterService, setColFilterService] = useState("");
  const [colFilterStatus, setColFilterStatus] = useState("");
  const [colFilterChallenge, setColFilterChallenge] = useState("");
  const [colFilterSms, setColFilterSms] = useState("");

  // Consultant/SalesExpert historical month selection state
  const [historicalSelectedMonth, setHistoricalSelectedMonth] = useState("2026-05");

  // 12 months successful sales bar chart data helper
  const chartData = useMemo(() => {
    const factor = activeUser ? (activeUser.full_name.length % 3 + 1) : 1; 
    return [
      { month: "تیر", amount: 45 * factor, count: 1 + factor },
      { month: "مرداد", amount: 62 * factor, count: 2 + factor },
      { month: "شهریور", amount: 55 * factor, count: 2 + factor },
      { month: "مهر", amount: 90 * factor, count: 3 + factor },
      { month: "آبان", amount: 110 * factor, count: 4 + factor },
      { month: "آذر", amount: 85 * factor, count: 3 + factor },
      { month: "دی", amount: 130 * factor, count: 5 + factor },
      { month: "بهمن", amount: 160 * factor, count: 6 + factor },
      { month: "اسفند", amount: 220 * factor, count: 8 + factor },
      { month: "فروردین", amount: 120 * factor, count: 4 + factor },
      { month: "اردیبهشت", amount: 190 * factor, count: 7 + factor },
      { month: "خرداد", amount: 240 * factor, count: 9 + factor },
    ].map(item => ({
      ...item,
      amount: item.amount,
      count: item.count,
    }));
  }, [activeUser]);

  // Modal & Slide-over states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"lead" | "opportunity">("lead");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Notifications display status
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);

  // Custom Confirmation modal state to override browser confirm restrictions
  const [modalConfirmAction, setModalConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Active alarms list triggered and showing popups
  interface ActiveAlarm {
    id: string;
    title: string;
    leadId: string;
  }
  const [activeAlarms, setActiveAlarms] = useState<ActiveAlarm[]>([]);

  // Config refs loaded from localStorage
  const [priceFieldRef, setPriceFieldRef] = useState<string>("price");
  const [wonStatusRef, setWonStatusRef] = useState<string>("ost_4");

  // Trigger reloading of state across components
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Helper helper to get triggered alarms
  const getTriggeredAlarms = (): string[] => {
    try {
      const data = localStorage.getItem("crm_triggered_alarms");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  };

  const saveTriggeredAlarm = (id: string) => {
    try {
      const list = getTriggeredAlarms();
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem("crm_triggered_alarms", JSON.stringify(list));
      }
    } catch {}
  };

  // Check login state on mount
  useEffect(() => {
    const user = CRMDatabase.getActiveUser();
    if (user) {
      setActiveUser(user);
    }
  }, []);

  // Fetch / Sync core lists from database
  useEffect(() => {
    if (activeUser) {
      const allLeads = CRMDatabase.getLeads();
      setLeads(allLeads);
      setDropdowns(CRMDatabase.getDropdowns());
      setNotifications(CRMDatabase.getNotifications());
      setPriceFieldRef(localStorage.getItem("crm_sales_price_field") || "price");
      setWonStatusRef(localStorage.getItem("crm_sales_won_status") || "ost_4");

      // Update selectedLead to its latest version from database to reflect inline reviews instantly
      if (selectedLead) {
        const updated = allLeads.find((l) => l.id === selectedLead.id);
        if (updated) {
          setSelectedLead(updated);
        }
      }
    }
  }, [activeUser, reloadTrigger, selectedLead?.id]);

  // Alarm interval check to push notifications and trigger popups
  useEffect(() => {
    if (!activeUser) return;

    const checkAlarms = () => {
      const now = new Date();
      // Format as YYYY-MM-DD
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const currentDateStr = `${year}-${month}-${day}`;

      // Format as HH:MM
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${hours}:${minutes}`;

      // Get all unfinished activities from database
      const activities = CRMDatabase.getActivities();
      const unfinished = activities.filter((act) => !act.is_done);

      unfinished.forEach((act) => {
        // Trigger if:
        // 1. Scheduled date is today
        // 2. Scheduled time has come/passed
        // 3. We have not triggered for this activity ID in current browser session or log
        if (act.scheduled_date === currentDateStr && act.scheduled_time <= currentTimeStr) {
          const triggeredAlarms = getTriggeredAlarms();
          if (!triggeredAlarms.includes(act.id)) {
            // Save to triggered log so we do not spam
            saveTriggeredAlarm(act.id);

            // 1. Add notification to local db
            CRMDatabase.addNotification({
              user_id: activeUser.id,
              title: "⏰ یادآوری فعالیت فوری",
              message: `موعد انجام فعالیت «${act.title}» فرا رسیده است! لطفاً جهت پیگیری پرونده اقدام کنید.`,
              lead_id: act.lead_id,
              notification_type: "activity_reminder",
              is_read: false
            });

            // 2. Trigger active UI flash popup state
            setActiveAlarms((prev) => {
              if (prev.some((p) => p.id === act.id)) return prev;
              return [...prev, { id: act.id, title: act.title, leadId: act.lead_id }];
            });

            // 3. Refresh dashboard state
            handleRefresh();
          }
        }
      });
    };

    // Run alarm checker immediately and then every 7 seconds
    checkAlarms();
    const interval = setInterval(checkAlarms, 7000);
    return () => clearInterval(interval);
  }, [activeUser, reloadTrigger]);

  const handleRefresh = () => {
    setReloadTrigger((p) => p + 1);
  };

  const handleLogout = () => {
    CRMDatabase.setActiveUser(null);
    setActiveUser(null);
  };

  // Star / Unstar target lead with direct sync to storage
  const toggleStarLead = (id: string, currentStarred: boolean) => {
    if (!activeUser) return;
    CRMDatabase.updateLead(id, { is_starred: !currentStarred }, activeUser);
    handleRefresh();
  };

  // Select / Deselect individual rows
  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  // Select / Deselect all currently viewable records on listing
  const handleSelectAllRows = (visibleLeads: Lead[]) => {
    const visibleIds = visibleLeads.map((l) => l.id);
    const areAllSelected = visibleIds.every((id) => selectedRowIds.includes(id));
    if (areAllSelected) {
      setSelectedRowIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedRowIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  // Bulk actions on selected rows
  const handleBulkDelete = () => {
    if (selectedRowIds.length === 0) return;
    setModalConfirmAction({
      message: `آیا از حذف گروهی و دائم ${selectedRowIds.length} پرونده کلاینت انتخاب‌شده اطمینان کامل دارید؟ این عمل غیر قابل بازگشت خواهد بود.`,
      onConfirm: () => {
        selectedRowIds.forEach((id) => {
          CRMDatabase.deleteLead(id);
        });
        setSelectedRowIds([]);
        handleRefresh();
      }
    });
  };

  const handleBulkStatusChange = (statusId: string) => {
    if (selectedRowIds.length === 0) return;
    selectedRowIds.forEach((id) => {
      CRMDatabase.updateLead(
        id,
        {
          [activeModule === "leads" ? "lead_status" : "opportunity_status"]: statusId,
        },
        activeUser!
      );
    });
    setSelectedRowIds([]);
    handleRefresh();
  };

  const handleBulkFieldChange = (fieldName: "referral" | "lead_source" | "service", optionId: string) => {
    if (selectedRowIds.length === 0) return;
    selectedRowIds.forEach((id) => {
      CRMDatabase.updateLead(
        id,
        {
          [fieldName]: optionId,
        },
        activeUser!
      );
    });
    setSelectedRowIds([]);
    handleRefresh();
  };

  // Convert a standard raw Lead into a sales Opportunity with custom values or pre-filled
  const handleConvertLeadToOpportunity = (targetLead: Lead) => {
    // We update module_type instantly and trigger opportunity detail parameters config
    setEditingLead(targetLead);
    setModalType("opportunity");
    setIsModalOpen(true);
  };

  const handleDeleteLead = (id: string) => {
    setModalConfirmAction({
      message: "آیا از حذف دائم و غیرقابل بازگشت پرونده این کلاینت اطمینان دارید؟ تمامی یادداشت‌ها و پیگیری‌های متصله نیز پاک خواهند شد.",
      onConfirm: () => {
        CRMDatabase.deleteLead(id);
        if (selectedLead?.id === id) {
          setSelectedLead(null);
        }
        handleRefresh();
      }
    });
  };

  // Filtering leads based on active module (leads vs opportunities), status filter, and searchQuery
  const filteredRecords = leads.filter((item) => {
    // Filter by module type
    const matchesModule = item.module_type === (activeModule === "leads" ? "lead" : "opportunity");
    if (!matchesModule) return false;

    // 1. Filter by Search Query combined filter (AND Logic / Filter Chain)
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const segments = query.split(/\s+/).filter(Boolean);
      const matchesAllSegments = segments.every(segment => {
        let fieldSpec = "";
        let valSpec = segment;
        
        if (segment.includes(":")) {
          const parts = segment.split(":");
          fieldSpec = parts[0].trim().toLowerCase();
          valSpec = parts.slice(1).join(":").toLowerCase();
        } else if (segment.includes("=")) {
          const parts = segment.split("=");
          fieldSpec = parts[0].trim().toLowerCase();
          valSpec = parts.slice(1).join("=").toLowerCase();
        }

        const refLabel = dropdowns.find(d => d.id === item.referral)?.label || "";
        const sourceLabel = dropdowns.find(d => d.id === item.lead_source)?.label || "";
        const serviceLabel = dropdowns.find(d => d.id === item.service)?.label || "";
        const statusId = item.module_type === "lead" ? item.lead_status : item.opportunity_status;
        const statusLabel = dropdowns.find(d => d.id === statusId)?.label || "";

        if (fieldSpec && valSpec) {
          if (["نام", "name", "full_name", "fullname"].includes(fieldSpec)) {
            return item.full_name.toLowerCase().includes(valSpec);
          }
          if (["تلفن", "phone", "mobile", "شماره", "موبایل"].includes(fieldSpec)) {
             return item.mobile.includes(valSpec);
          }
          if (["چالش", "challenge", "عارضه", "شرح", "request", "req"].includes(fieldSpec)) {
            return !(!item.request_challenge || !item.request_challenge.toLowerCase().includes(valSpec));
          }
          if (["منبع", "source", "کانال", "بست"].includes(fieldSpec)) {
            return sourceLabel.toLowerCase().includes(valSpec) || refLabel.toLowerCase().includes(valSpec);
          }
          if (["سرویس", "خدمت", "service"].includes(fieldSpec)) {
            return serviceLabel.toLowerCase().includes(valSpec);
          }
          if (["وضعیت", "status", "stage"].includes(fieldSpec)) {
            return statusLabel.toLowerCase().includes(valSpec);
          }
        }

        // Default global search
        const checkVal = valSpec;
        return (
          item.full_name.toLowerCase().includes(checkVal) ||
          item.mobile.includes(checkVal) ||
          (item.request_challenge && item.request_challenge.toLowerCase().includes(checkVal)) ||
          (item.sms_text && item.sms_text.toLowerCase().includes(checkVal)) ||
          refLabel.toLowerCase().includes(checkVal) ||
          sourceLabel.toLowerCase().includes(checkVal) ||
          serviceLabel.toLowerCase().includes(checkVal) ||
          statusLabel.toLowerCase().includes(checkVal)
        );
      });
      if (!matchesAllSegments) return false;
    }

    // 2. Specific Columns Title-based Filters (AND logic)
    if (colFilterCreated && !item.created_at.toLowerCase().includes(colFilterCreated.toLowerCase())) return false;
    
    const convertedTime = item.converted_at || item.created_at;
    if (colFilterModified && !convertedTime.toLowerCase().includes(colFilterModified.toLowerCase())) return false;

    if (colFilterName && !item.full_name.toLowerCase().includes(colFilterName.toLowerCase())) return false;
    
    if (colFilterReferral) {
      const refLabel = dropdowns.find(d => d.id === item.referral)?.label || "";
      if (!refLabel.toLowerCase().includes(colFilterReferral.toLowerCase())) return false;
    }

    if (colFilterMobile && !item.mobile.includes(colFilterMobile)) return false;

    if (colFilterSource) {
      const srcLabel = dropdowns.find(d => d.id === item.lead_source)?.label || "";
      if (!srcLabel.toLowerCase().includes(colFilterSource.toLowerCase())) return false;
    }

    if (colFilterService) {
      const srvLabel = dropdowns.find(d => d.id === item.service)?.label || "";
      if (!srvLabel.toLowerCase().includes(colFilterService.toLowerCase())) return false;
    }

    if (colFilterStatus) {
      const statusId = item.module_type === "lead" ? item.lead_status : item.opportunity_status;
      const statusLabel = dropdowns.find(d => d.id === statusId)?.label || "";
      if (!statusLabel.toLowerCase().includes(colFilterStatus.toLowerCase())) return false;
    }

    if (colFilterChallenge && (!item.request_challenge || !item.request_challenge.toLowerCase().includes(colFilterChallenge.toLowerCase()))) return false;

    if (colFilterSms && (!item.sms_text || !item.sms_text.toLowerCase().includes(colFilterSms.toLowerCase()))) return false;

    // 3. Dropdown Toolbar Status Filter
    if (activeModule === "leads") {
      if (statusFilter !== "all" && item.lead_status !== statusFilter) return false;
    } else {
      if (statusFilter !== "all" && item.opportunity_status !== statusFilter) return false;
    }

    // 4. Dropdown Toolbar Referral Filter
    if (referralFilter !== "all" && item.referral !== referralFilter) return false;

    return true;
  });

  // Find mapped referral ID for current user to track their monthly finalized sales
  const getActiveUserReferralId = () => {
    if (!activeUser) return null;
    const refs = dropdowns.filter(d => d.category === "referral");
    const matched = refs.find(r => 
      activeUser.full_name.includes(r.label) || 
      r.label.includes(activeUser.full_name) ||
      r.label.split(" ").some(part => part.length >= 2 && activeUser.full_name.includes(part))
    );
    return matched ? matched.id : null;
  };

  const userReferralId = getActiveUserReferralId();
  const currentMonthYear = "2026-06"; // Static/Dynamic Month representing local 2026-06 environment time

  // Calculate high quality financial metrics and totals
  // Each user sees their own statistics up top (total leads, total opportunities, sales volume) matching referral name
  const totalLeadsCount = leads.filter((l) => {
    const isLead = l.module_type === "lead";
    const matchesUser = userReferralId ? l.referral === userReferralId : true;
    return isLead && matchesUser;
  }).length;

  const totalOpportunitiesCount = leads.filter((l) => {
    const isOpp = l.module_type === "opportunity";
    const matchesUser = userReferralId ? l.referral === userReferralId : true;
    return isOpp && matchesUser;
  }).length;
  
  // Sum value of deals (opportunities which have price) in Toman currency for logged in user
  const totalPriceVolume = leads
    .filter((l) => {
      const isOpp = l.module_type === "opportunity";
      const hasPrice = !!l.price;
      const matchesUser = userReferralId ? l.referral === userReferralId : true;
      return isOpp && hasPrice && matchesUser;
    })
    .reduce((sum, item) => sum + Number(item.price || 0), 0);

  const userMonthlyConfirmedSales = leads
    .filter((l) => {
      const isOpp = l.module_type === "opportunity";
      const isWon = l.opportunity_status === (wonStatusRef || "ost_4");
      const dateStr = l.converted_at || l.created_at;
      const isThisMonth = dateStr?.startsWith(currentMonthYear);
      const belongsToUser = userReferralId ? l.referral === userReferralId : true;
      return isOpp && isWon && isThisMonth && belongsToUser;
    })
    .reduce((sum, item) => {
      // Read price from the admin-defined sales reference field (or standard price field)
      const fieldKey = (priceFieldRef || "price") as keyof Lead;
      const priceVal = Number(item[fieldKey] ?? item.price ?? 0);
      return sum + priceVal;
    }, 0);

  // Calculated historical previous months' sales for logged-in sales expert
  const historicalReport = useMemo(() => {
    if (!userReferralId) return null;
    const items = leads.filter(l => {
      const isOpp = l.module_type === "opportunity";
      const isWon = l.opportunity_status === (wonStatusRef || "ost_4");
      const belongsToUser = l.referral === userReferralId;
      const dateStr = l.converted_at || l.created_at;
      const matchesMonth = dateStr?.startsWith(historicalSelectedMonth);
      return isOpp && isWon && belongsToUser && matchesMonth;
    });

    const sumVal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    return {
      items,
      sumVal
    };
  }, [leads, userReferralId, historicalSelectedMonth, wonStatusRef]);

  // Completion task trackers
  const pendingTasksCount = CRMDatabase.getActivities().filter((a) => !a.is_done).length;

  // Resolve category badges labels and hex coloring
  const getBadgeLabel = (id?: string) => {
    return dropdowns.find((d) => d.id === id)?.label || "-";
  };

  const getBadgeColor = (id?: string) => {
    return dropdowns.find((d) => d.id === id)?.color || "#6b7280";
  };

  if (!activeUser) {
    return <AuthScreen onLoginSuccess={(usr) => setActiveUser(usr)} />;
  }

  return (
    <div className="min-h-screen text-slate-100 relative pb-12 overflow-x-hidden" id="enterprise-crm-app">
      {/* Dynamic atmospheric grid ambient glow */}
      <div className="absolute top-0 right-1/3 w-[600px] h-[300px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main sticky top glass header navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/70 backdrop-blur-md border-b border-white/5 py-4 px-6 select-none" id="dashboard-navbar">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo and title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 text-emerald-400 rounded-xl border border-emerald-500/20 shadow">
              <Building className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>سامانه مدیریت ارتباط با مشتریان</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/20">Enterprise CRM</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">پایگاه داده بهینه‌سازی شده و فرآیندی سازمان</p>
            </div>
          </div>

          {/* Module navigation buttons */}
          <nav className="hidden md:flex items-center gap-1.5" id="navbar-menu">
            <button
              onClick={() => {
                setActiveModule("leads");
                setSelectedLead(null);
                setStatusFilter("all");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
                activeModule === "leads"
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>مدیریت سرنخ‌ها ({totalLeadsCount})</span>
            </button>

            <button
              onClick={() => {
                setActiveModule("opportunities");
                setSelectedLead(null);
                setStatusFilter("all");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
                activeModule === "opportunities"
                  ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>فرصت‌های معامله ({totalOpportunitiesCount})</span>
            </button>

            <button
              onClick={() => {
                setActiveModule("calendar");
                setSelectedLead(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
                activeModule === "calendar"
                  ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>تقویم و تسک‌ها</span>
              {pendingTasksCount > 0 && (
                <span className="bg-rose-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full">
                  {pendingTasksCount}
                </span>
              )}
            </button>

            {activeUser?.role === "admin" && (
              <button
                onClick={() => {
                  setActiveModule("management");
                  setSelectedLead(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
                  activeModule === "management"
                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Settings className="w-4 h-4 text-amber-400" />
                <span>پنل مدیریت (ایزاتس)</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveModule("installments");
                setSelectedLead(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-2 ${
                activeModule === "installments"
                  ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Scale className="w-4 h-4 text-indigo-400" />
              <span>فروش اقساطی</span>
            </button>
          </nav>

          {/* User badge, alerts panel, and logout */}
          <div className="flex items-center gap-3">

            {/* Notification trigger with indicator badge */}
            <div className="relative">
              <button
                onClick={() => setIsNotifDrawerOpen((prev) => !prev)}
                className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition cursor-pointer relative overflow-visible"
              >
                <Bell className="w-4 h-4" />
                {notifications.some((n) => !n.is_read) && (
                  <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>

              {/* Real-time Alerts Dropdown menu */}
              {isNotifDrawerOpen && (
                <div className="absolute left-0 mt-3 w-80 glass-panel p-4 rounded-xl shadow-2xl border border-white/10 text-right space-y-3 z-50">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-cyan-400" />
                      <span>اعلانات فوری فعالیت‌ها</span>
                    </span>
                    <button
                      onClick={() => {
                        CRMDatabase.markAllNotificationsAsRead();
                        handleRefresh();
                      }}
                      className="text-[9px] text-cyan-400 hover:underline cursor-pointer"
                    >
                      خواندن همه
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-[11px] text-slate-500 text-center py-4">پیغامی در کارتابل شما نیست.</p>
                    ) : (
                      notifications.map((not) => (
                        <div
                          key={not.id}
                          className={`p-2.5 text-[11px] rounded-lg border text-right transition-all ${
                            not.is_read
                              ? "bg-slate-900/10 border-white/5 opacity-60"
                              : "bg-emerald-500/5 border-emerald-500/20"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-300">{not.title}</span>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {new Date(not.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-slate-400 leading-relaxed text-xs">{not.message}</p>
                          {!not.is_read && (
                            <button
                              onClick={() => {
                                CRMDatabase.markNotificationAsRead(not.id);
                                handleRefresh();
                              }}
                              className="text-[9px] text-emerald-400 font-bold hover:underline mt-1.5 block cursor-pointer"
                            >
                              علامت به عنوان خوانده شده
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active user state card */}
            <div className="hidden lg:flex items-center gap-2 border-r border-white/5 pr-3 mr-1">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-200">{activeUser.full_name}</p>
                <p className="text-[9px] text-slate-400">
                  {activeUser.role === "admin" 
                    ? "مدیر سیستم" 
                    : activeUser.role === "consultant" 
                      ? "کارشناس فروش" 
                      : "سرپرست سیستم"}
                </p>
              </div>
              <div className="p-1.5 bg-slate-800 rounded-lg text-emerald-400 border border-white/5">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>

            {/* Logout trigger button */}
            <button
              onClick={handleLogout}
              className="p-2.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl transition cursor-pointer overflow-visible"
              title="خروج از سامانه"
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>
        </div>
      </header>

      {/* Main Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 gap-6">
        
        {selectedLead ? (
          <div className="w-full animate-fadeIn" id="full-workspace-detail-panel">
            <LeadDetailView
              lead={selectedLead}
              activeUser={activeUser}
              onChanged={handleRefresh}
              onClose={() => setSelectedLead(null)}
            />
          </div>
        ) : (
          <>
            {/* Responsive Navbar Mobile Drawer */}
        <div className="md:hidden flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900/40 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveModule("leads")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${activeModule === "leads" ? "bg-emerald-500/10 text-emerald-300" : "text-slate-400"}`}
          >
            سرنخ‌ها
          </button>
          <button
            onClick={() => setActiveModule("opportunities")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${activeModule === "opportunities" ? "bg-cyan-500/10 text-cyan-300" : "text-slate-400"}`}
          >
            فرصت‌ها
          </button>
          <button
            onClick={() => setActiveModule("calendar")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${activeModule === "calendar" ? "bg-purple-500/10 text-purple-300" : "text-slate-400"}`}
          >
            روزشمار
          </button>
          
          <button
            onClick={() => setActiveModule("installments")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${activeModule === "installments" ? "bg-indigo-500/10 text-indigo-300" : "text-slate-400"}`}
          >
            فروش قسطی
          </button>

          {activeUser?.role === "admin" && (
            <button
              onClick={() => setActiveModule("management")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${activeModule === "management" ? "bg-amber-500/10 text-amber-300" : "text-slate-400"}`}
            >
              پنل مدیریت
            </button>
          )}
        </div>

        {/* Bold, Labeled Divider: KPI Stats Section */}
        <div className="flex items-center gap-3 my-2 text-right select-none animate-fadeIn" dir="rtl">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-black tracking-wider text-slate-200 uppercase">خلاصه وضعیت شاخص‌های عملکردی و جریان درآمد قیف فروش (Funnel Metrics & Revenue Summary)</h2>
              <div className="flex-1 h-[1px] bg-gradient-to-l from-white/10 to-transparent"></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">رهگیری لحظه‌ای حجم پرونده‌ها، معاملات فعال و وضعیت پیگیری سازمان در یک نگاه</p>
          </div>
        </div>

        {/* Funnel Metrics & Analytics Grid Summary */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="stats-analytics-section">
          {/* Card 1: Leads */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between text-right shadow-sm">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">مجموع سرنخ‌های متقاضی</span>
              <p className="text-2xl font-black text-emerald-400 font-mono tracking-tight text-left">
                {totalLeadsCount}
              </p>
              <span className="text-[9px] text-slate-500">کارنال اول فرآیند فروش سازمان</span>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Active Opportunities */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between text-right shadow-sm">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">فرصت‌های فعال معامله</span>
              <p className="text-2xl font-black text-cyan-400 font-mono tracking-tight text-left">
                {totalOpportunitiesCount}
              </p>
              <span className="text-[9px] text-slate-500">پرونده‌های فعال مذاکره و پیش‌فاکتور</span>
            </div>
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Sum value volume in Tomans */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between text-right shadow-sm">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">مبلغ فروش بالقوه</span>
              <p className="text-xl font-black font-mono tracking-tight text-left text-slate-100">
                {totalPriceVolume.toLocaleString("fa-IR")}
              </p>
              <span className="text-[9px] text-cyan-400 font-medium">تومان ایران (ریال معادل شده)</span>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Monthly Confirmed Won Sales of the User */}
          <div className="glass-panel p-4 rounded-2xl border-white/5 flex items-center justify-between text-right shadow-sm border-amber-500/20 bg-amber-500/[0.02]">
            <div>
              <span className="text-[10px] text-amber-300 font-bold block mb-0.5 animate-pulse">
                {userReferralId ? "مجموع فروش قطعی من (ماه جاری)" : "مجموع فروش کل تیم (ماه جاری)"}
              </span>
              <p className="text-xl font-black font-mono tracking-tight text-left text-amber-400">
                {userMonthlyConfirmedSales.toLocaleString("fa-IR")}
              </p>
              <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                هدف: « {getBadgeLabel(wonStatusRef || "ost_4")} »
              </span>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          {/* Card 5: Action Tasks */}
          <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between text-right shadow-sm">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">وظایف و پیگیری کارهای باز</span>
              <p className="text-2xl font-black text-amber-400 font-mono tracking-tight text-left">
                {pendingTasksCount}
              </p>
              <span className="text-[9px] text-slate-500">مکالمه‌ها، جلسات و فعالیت‌ها</span>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Historical Monthly Sales Tool for Consultants */}
        {activeUser.role !== "admin" && (
          <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4 animate-fadeIn text-right" dir="rtl" id="consultant-historical-block">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200">سابقه عملکرد و فروش ماه‌های گذشته من</h3>
                <p className="text-[11px] text-slate-400 font-medium">امکان مرور میزان فروش موفق و بررسی قراردادهای نهایی شده در ماه‌های گذشته.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">ماه مورد نظر:</span>
                <select
                  value={historicalSelectedMonth}
                  onChange={(e) => setHistoricalSelectedMonth(e.target.value)}
                  className="bg-slate-950 border border-white/10 text-xs text-slate-200 py-1.5 px-3 rounded-lg cursor-pointer"
                  id="consultant-month-picker"
                >
                  <option value="2026-06">ژوئن ۲۰۲۶ (ماه جاری)</option>
                  <option value="2026-05">مه ۲۰۲۶ (ماه گذشته)</option>
                  <option value="2026-04">آوریل ۲۰۲۶</option>
                  <option value="2026-03">مارس ۲۰۲۶</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
              
              {/* Performance growth bar chart */}
              <div className="lg:col-span-2 bg-slate-900/40 p-4 rounded-xl border border-white/5 flex flex-col justify-between" id="performance-chart-card">
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">کنترل رشد عملکرد فردی</span>
                  <span className="text-[11px] font-semibold text-slate-200">میزان فروش موفق من در ۱۲ ماه اخیر (میلیون تومان)</span>
                </div>
                
                <div className="w-full h-44" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', textAlign: 'right' }} 
                        labelStyle={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: 11, color: '#10b981' }}
                        formatter={(value) => [`${value} میلیون تومان`, "ارزش معامله‌ها"]}
                      />
                      <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={18}>
                        {chartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index === 11 ? "#34d399" : "#059669"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Statistical numbers cards in vertical stack */}
              <div className="lg:col-span-1 flex flex-col justify-between gap-3">
                <div className="p-3.5 bg-slate-900/40 rounded-xl border border-white/5 text-right flex-1 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 block font-bold mb-1">مجموع فروش در ماه {historicalSelectedMonth}</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {historicalReport ? historicalReport.sumVal.toLocaleString("fa-IR") : "۰"} تومان
                  </span>
                </div>

                <div className="p-3.5 bg-slate-900/40 rounded-xl border border-white/5 text-right flex-1 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 block font-bold mb-1">تعداد قراردادهای منعقده</span>
                  <span className="text-sm font-black text-cyan-400 font-mono">
                    {historicalReport ? historicalReport.items.length : 0} پرونده مالی
                  </span>
                </div>

                <div className="p-3.5 bg-slate-900/40 rounded-xl border border-white/5 text-right flex-1 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 block font-bold mb-1">کد نماینده فروش و نقش سازمانی</span>
                  <span className="text-xs font-bold text-slate-300">
                    {activeUser.full_name} ({activeUser.role === "supervisor" ? "سرپرست تیم" : "کارشناس فروش"})
                  </span>
                </div>
              </div>

            </div>

            {historicalReport && historicalReport.items.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/20 text-xs">
                <table className="w-full text-right" dir="rtl">
                  <thead className="bg-slate-900/60 text-slate-300">
                    <tr>
                      <th className="p-2.5">نام کارفرما</th>
                      <th className="p-2.5">شناسه تماس</th>
                      <th className="p-2.5">نوع خدمت درخواستی</th>
                      <th className="p-2.5">کانال معرفی مشتری</th>
                      <th className="p-2.5 text-left pl-4">مبلغ نهایی تراکنش</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {historicalReport.items.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-900/20 transition-all">
                        <td className="p-2.5 font-bold text-slate-200">{it.full_name}</td>
                        <td className="p-2.5 font-mono text-slate-400">{it.mobile}</td>
                        <td className="p-2.5 text-slate-300">{getBadgeLabel(it.service)}</td>
                        <td className="p-2.5 text-slate-300">{getBadgeLabel(it.lead_source)}</td>
                        <td className="p-2.5 text-left text-emerald-400 font-bold font-mono pl-4">
                          {Number(it.price || 0).toLocaleString("fa-IR")} تومان
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 text-center py-4 bg-slate-900/10 rounded-xl border border-dashed border-white/5">
                سند موفقی مبنی بر بسته شدن قرارداد به نام شما در ماه {historicalSelectedMonth} یافت نشد.
              </p>
            )}
          </div>
        )}

        {/* Primary Functional Panel Switcher */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="primary-view-board">
          
          {/* Main workspace section */}
          <div className={`${selectedLead ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12"} space-y-6 transition-all`}>
            
            {/* View 1 & 2: Leads & Opportunities Lists */}
            {(activeModule === "leads" || activeModule === "opportunities") && (
              <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
                
                {/* Search, Filter criteria parameters, and view toggles */}
                <div className="space-y-4">
                  
                  {/* Top line with active view indicator and create button group matching screenshot styling */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 shadow">
                        <Filter className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                          <span>{activeModule === "leads" ? "سرنخ‌های فروش معتبر" : "فرصت‌های معامله فعال"}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded-full border border-white/5">
                            {filteredRecords.length} پرونده
                          </span>
                        </h2>
                        <p className="text-[10px] text-slate-500 mt-0.5">مدیریت ارتباطات و کانال قیف فروش هوشمند سازمان</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Interactive View Toggles (لیست & کاریز) matching top bar from user screenshot */}
                      <div className="bg-slate-950 p-1 rounded-xl border border-white/5 flex items-center gap-0.5">
                        <button
                          onClick={() => setViewMode("list")}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
                            viewMode === "list"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 shadow-sm"
                              : "text-slate-400 hover:text-white"
                          }`}
                          title="نمای جدولی فشرده (ERP)"
                        >
                          <List className="w-3.5 h-3.5" />
                          <span>لیست</span>
                        </button>
                        <button
                          onClick={() => setViewMode("card")}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1.5 ${
                            viewMode === "card"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 shadow-sm"
                              : "text-slate-400 hover:text-white"
                          }`}
                          title="نمای کارت بورد"
                        >
                          <Grid className="w-3.5 h-3.5" />
                          <span>کاریز</span>
                        </button>
                      </div>

                      {/* Sparkle Quick Clear filters indicator */}
                      {(statusFilter !== "all" || referralFilter !== "all" || searchQuery !== "" || colFilterCreated !== "" || colFilterModified !== "" || colFilterName !== "" || colFilterReferral !== "" || colFilterMobile !== "" || colFilterSource !== "" || colFilterService !== "" || colFilterStatus !== "" || colFilterChallenge !== "" || colFilterSms !== "") && (
                        <button
                          onClick={() => {
                            setStatusFilter("all");
                            setReferralFilter("all");
                            setSearchQuery("");
                            setColFilterCreated("");
                            setColFilterModified("");
                            setColFilterName("");
                            setColFilterReferral("");
                            setColFilterMobile("");
                            setColFilterSource("");
                            setColFilterService("");
                            setColFilterStatus("");
                            setColFilterChallenge("");
                            setColFilterSms("");
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-[10px] bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition border border-amber-500/20 flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>پاک‌سازی فیلترها</span>
                        </button>
                      )}

                      {/* New client trigger button */}
                      <button
                        onClick={() => {
                          setEditingLead(null);
                          setModalType(activeModule === "leads" ? "lead" : "opportunity");
                          setIsModalOpen(true);
                        }}
                        className="glass-btn-primary hover:scale-[1.02] text-xs px-4 py-2 rounded-xl text-slate-950 bg-gradient-to-r from-emerald-400 to-emerald-500 font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10 transition overflow-visible border-0"
                        id="create-new-lead-btn"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>ثبت {activeModule === "leads" ? "سرنخ" : "فرصت معامله"} جدید</span>
                      </button>
                    </div>
                  </div>

                  {/* Labeled Divider: Search & Filters */}
                  <div className="flex items-center gap-3 pt-4 text-right select-none animate-fadeIn" dir="rtl">
                    <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[11px] font-black text-slate-200 uppercase">مکانیزم‌های جستجو و ردیابی کلاینت‌ها (Advanced Filter & Target Finder)</h3>
                        <div className="flex-1 h-[1px] bg-gradient-to-l from-white/10 to-transparent"></div>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-0.5">امکان پالایش کلاینت‌ها بر اساس کانال جذب، وضعیت ارتباطی، مسئول ارجاع یا متن درخواست</p>
                    </div>
                  </div>

                  {/* Search input line */}
                  <div className="flex flex-col lg:flex-row gap-3">
                    {/* Dynamic Search */}
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="جستجو در نام کلاینت، پیگیری، تلفن همراه، دپارتمان یا متن شرح چالش..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full glass-input text-xs p-3 rounded-xl text-right pr-10 pl-4 bg-slate-950/40 border-white/5 hover:border-white/10 focus:border-emerald-500/35 focus:ring-0.5 focus:ring-emerald-500/20"
                        id="leads-search-input"
                      />
                      <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3.5" />
                      <div className="text-[9px] text-slate-400 mt-1.5 flex flex-wrap gap-1.5 justify-end items-center" dir="rtl">
                        <span className="opacity-70 font-semibold">جستجوی ترکیبی (Filter Chain):</span>
                        <code className="text-emerald-400 bg-slate-950/60 px-1.5 py-0.5 rounded border border-white/5 font-mono">نام:علی</code>
                        <code className="text-emerald-500 bg-slate-950/60 px-1.5 py-0.5 rounded border border-white/5 font-mono">تلفن:0912</code>
                        <code className="text-cyan-400 bg-slate-950/60 px-1.5 py-0.5 rounded border border-white/5 font-mono">وضعیت:جدید</code>
                        <code className="text-indigo-400 bg-slate-950/60 px-1.5 py-0.5 rounded border border-white/5 font-mono">چالش:وب</code>
                      </div>
                    </div>

                    {/* Filter Dropdowns block */}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-slate-300 text-right cursor-pointer border border-white/5 focus:border-emerald-500/35"
                        id="status-filter-select"
                      >
                        <option value="all">همه وضعیت‌ها</option>
                        {dropdowns
                          .filter((d) => d.category === (activeModule === "leads" ? "lead_status" : "opportunity_status"))
                          .map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              وضعیت: {opt.label}
                            </option>
                          ))}
                      </select>

                      <select
                        value={referralFilter}
                        onChange={(e) => setReferralFilter(e.target.value)}
                        className="glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-slate-300 text-right cursor-pointer border border-white/5 focus:border-emerald-500/35"
                        id="referral-filter-select"
                      >
                        <option value="all">همه ارجاع‌ها</option>
                        {dropdowns
                          .filter((d) => d.category === "referral")
                          .map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              ارجاع: {opt.label}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Smart ERP Bulk Action Manager display bar when row selected */}
                  {selectedRowIds.length > 0 && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-wrap items-center justify-between gap-3 text-right animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-slate-200">
                          تعداد <strong className="text-emerald-400 text-sm font-mono mx-1">{selectedRowIds.length}</strong> پرونده انتخاب شده است.
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Quick status update */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">تغییر وضعیت:</span>
                          <select
                            onChange={(e) => {
                              if (e.target.value !== "") {
                                handleBulkStatusChange(e.target.value);
                                e.target.value = "";
                              }
                            }}
                            className="bg-slate-905 border border-white/10 text-[11px] rounded px-2 py-1 text-slate-300 cursor-pointer"
                          >
                            <option value="">انتخاب وضعیت...</option>
                            {dropdowns
                              .filter((d) => d.category === (activeModule === "leads" ? "lead_status" : "opportunity_status"))
                              .map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Bulk Change Referral */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">ارجاع به:</span>
                          <select
                            onChange={(e) => {
                              if (e.target.value !== "") {
                                handleBulkFieldChange("referral", e.target.value);
                                e.target.value = "";
                              }
                            }}
                            className="bg-slate-905 border border-white/10 text-[11px] rounded px-2 py-1 text-slate-300 cursor-pointer text-xs"
                          >
                            <option value="">انتخاب ارجاع...</option>
                            {dropdowns
                              .filter((d) => d.category === "referral")
                              .map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Bulk Change Lead Source */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">منبع سرنخ:</span>
                          <select
                            onChange={(e) => {
                              if (e.target.value !== "") {
                                handleBulkFieldChange("lead_source", e.target.value);
                                e.target.value = "";
                              }
                            }}
                            className="bg-slate-905 border border-white/10 text-[11px] rounded px-2 py-1 text-slate-300 cursor-pointer text-xs"
                          >
                            <option value="">انتخاب منبع...</option>
                            {dropdowns
                              .filter((d) => d.category === "lead_source")
                              .map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Bulk Change Service */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">سرویس:</span>
                          <select
                            onChange={(e) => {
                              if (e.target.value !== "") {
                                handleBulkFieldChange("service", e.target.value);
                                e.target.value = "";
                              }
                            }}
                            className="bg-slate-905 border border-white/10 text-[11px] rounded px-2 py-1 text-slate-300 cursor-pointer text-xs"
                          >
                            <option value="">انتخاب سرویس...</option>
                            {dropdowns
                              .filter((d) => d.category === "service")
                              .map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                          </select>
                        </div>

                        {/* Bulk Delete */}
                        <button
                          onClick={handleBulkDelete}
                          className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold rounded-lg transition-all border border-rose-500/30 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف گروهی ({selectedRowIds.length})</span>
                        </button>
                        
                        {/* Clear Selection */}
                        <button
                          onClick={() => setSelectedRowIds([])}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-lg transition cursor-pointer"
                        >
                          انصراف انتخاب
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* Grid Lists table of records matches search criteria */}
                {/* Labeled Divider: Records Table / Kanban Grid */}
                <div className="flex items-center gap-3 pt-3 text-right select-none animate-fadeIn" dir="rtl">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black tracking-wider text-slate-200 uppercase">
                        {activeModule === "leads" ? "مخزن اصلی سرنخ‌ها و پرونده‌های خام اول فرآیند" : "سامانه معاهدات مالی پرونده‌ها و فرصت‌های فعال فروش"} (Registry Hub & Deal Index)
                      </h3>
                      <div className="flex-1 h-[1px] bg-gradient-to-l from-white/10 to-transparent"></div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">نمایش تفصیلی اطلاعات هویتی، وضعیت مذاکره، تخصیص پرسنل مسئول و شرح عارضه‌یابی ثبت شده</p>
                  </div>
                </div>
                {filteredRecords.length === 0 ? (
                  <div className="p-12 text-center space-y-3 bg-slate-900/15 rounded-xl border border-white/5" id="records-empty-block">
                    <Info className="w-8 h-8 text-slate-500 mx-auto" />
                    <h3 className="text-sm font-semibold text-slate-300">هیچ کلاینتی یافت نشد!</h3>
                    <p className="text-xs text-slate-500">رکوردی منطبق بر فیلتر جستجوی شما یافت نشد. می‌توانید مورد جدیدی را ایجاد کنید.</p>
                  </div>
                ) : viewMode === "list" ? (
                  /* 1. Enterpise Highly customized Horizontal ERP Table layout matching screenshot */
                  <div className="overflow-x-auto w-full rounded-2xl border border-white/5 bg-slate-950/20 shadow-xl" id="enterprise-crm-table-container">
                    <table className="w-full text-right border-collapse text-[11px]" dir="rtl">
                      <thead>
                        <tr className="bg-slate-950 text-slate-300 font-extrabold border-b border-white/5 select-none divide-x divide-x-reverse divide-white/5">
                          <th className="py-3.5 px-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={filteredRecords.length > 0 && filteredRecords.every((r) => selectedRowIds.includes(r.id))}
                              onChange={() => handleSelectAllRows(filteredRecords)}
                              className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer w-3.5 h-3.5 mx-auto"
                            />
                          </th>
                          <th className="py-3.5 px-2 w-8 text-center text-[10px] text-slate-400">ستاره</th>
                          <th className="py-3.5 px-4 font-bold whitespace-nowrap text-slate-300 text-center">زمان ایجاد</th>
                          <th className="py-3.5 px-4 font-bold whitespace-nowrap text-slate-300 text-center">زمان ویرایش</th>
                          <th className="py-3.5 px-4 font-bold whitespace-nowrap text-slate-300 min-w-[140px]">نام و نام خانوادگی</th>
                          <th className="py-3.5 px-4 font-bold whitespace-nowrap text-slate-300 min-w-[130px]">ارجاع داده شده</th>
                          <th className="py-3.5 px-4 font-bold whitespace-nowrap text-slate-300 min-w-[110px]">شماره موبایل</th>
                          <th className="py-3.5 px-4 font-bold whitespace-nowrap text-slate-300 min-w-[120px]">منبع سرنخ</th>
                          <th className="py-3.5 px-4 font-bold whitespace-nowrap text-slate-300 min-w-[100px]">سرویس</th>
                          <th className="py-3.5 px-4 font-bold whitespace-nowrap text-slate-400 min-w-[150px] text-center">وضعیت سرنخ/پرونده</th>
                          <th className="py-3.5 px-4 font-bold whitespace-nowrap text-slate-300 min-w-[200px]">درخواست/چالش</th>
                          <th className="py-3.5 px-4 font-bold whitespace-nowrap text-slate-300 min-w-[150px]">متن پیامک</th>
                          <th className="py-3.5 px-3 text-center text-slate-300 font-bold min-w-[80px]">عملیات</th>
                        </tr>
                        <tr className="bg-slate-900/45 text-slate-300 border-b border-white/5 divide-x divide-x-reverse divide-white/5">
                          <th className="p-1 text-center"></th>
                          <th className="p-1 text-center"></th>
                          <th className="p-1 text-center">
                            <input
                              type="text"
                              placeholder="جستجو..."
                              value={colFilterCreated}
                              onChange={(e) => setColFilterCreated(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded px-1 py-1 text-[10px] text-center font-mono text-slate-300 placeholder:text-slate-650 outline-none focus:border-emerald-500/30"
                            />
                          </th>
                          <th className="p-1 text-center">
                            <input
                              type="text"
                              placeholder="جستجو..."
                              value={colFilterModified}
                              onChange={(e) => setColFilterModified(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded px-1 py-1 text-[10px] text-center font-mono text-slate-300 placeholder:text-slate-655 outline-none focus:border-emerald-500/30"
                            />
                          </th>
                          <th className="p-1">
                            <input
                              type="text"
                              placeholder="نام..."
                              value={colFilterName}
                              onChange={(e) => setColFilterName(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded px-1.5 py-1 text-[10px] text-right font-medium text-slate-300 placeholder:text-slate-655 outline-none focus:border-emerald-500/30"
                            />
                          </th>
                          <th className="p-1">
                            <input
                              type="text"
                              placeholder="ارجاع..."
                              value={colFilterReferral}
                              onChange={(e) => setColFilterReferral(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded px-1.5 py-1 text-[10px] text-right font-medium text-slate-300 placeholder:text-slate-655 outline-none focus:border-emerald-500/30"
                            />
                          </th>
                          <th className="p-1 text-center">
                            <input
                              type="text"
                              placeholder="موبایل..."
                              value={colFilterMobile}
                              onChange={(e) => setColFilterMobile(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded px-1 py-1 text-[10px] text-center font-mono text-slate-300 placeholder:text-slate-655 outline-none focus:border-emerald-500/30"
                            />
                          </th>
                          <th className="p-1">
                            <input
                              type="text"
                              placeholder="منبع..."
                              value={colFilterSource}
                              onChange={(e) => setColFilterSource(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded px-1.5 py-1 text-[10px] text-right font-medium text-slate-300 placeholder:text-slate-655 outline-none focus:border-emerald-500/30"
                            />
                          </th>
                          <th className="p-1">
                            <input
                              type="text"
                              placeholder="خدمت..."
                              value={colFilterService}
                              onChange={(e) => setColFilterService(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded px-1.5 py-1 text-[10px] text-right font-medium text-slate-300 placeholder:text-slate-655 outline-none focus:border-emerald-500/30"
                            />
                          </th>
                          <th className="p-1 text-center">
                            <input
                              type="text"
                              placeholder="وضعیت..."
                              value={colFilterStatus}
                              onChange={(e) => setColFilterStatus(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded px-1.5 py-1 text-[10px] text-center font-medium text-slate-300 placeholder:text-slate-655 outline-none focus:border-emerald-500/30"
                            />
                          </th>
                          <th className="p-1">
                            <input
                              type="text"
                              placeholder="چالش..."
                              value={colFilterChallenge}
                              onChange={(e) => setColFilterChallenge(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded px-1.5 py-1 text-[10px] text-right font-medium text-slate-300 placeholder:text-slate-655 outline-none focus:border-emerald-500/30"
                            />
                          </th>
                          <th className="p-1">
                            <input
                              type="text"
                              placeholder="پیامک..."
                              value={colFilterSms}
                              onChange={(e) => setColFilterSms(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded px-1.5 py-1 text-[10px] text-right font-medium text-slate-300 placeholder:text-slate-655 outline-none focus:border-emerald-500/30"
                            />
                          </th>
                          <th className="p-1 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredRecords.map((item) => {
                          const isTargetSelected = selectedLead?.id === item.id;
                          const isRowChecked = selectedRowIds.includes(item.id);
                          
                          // Format Persian Created Time & Edit Time custom offsets
                          const formatPersianDateTime = (dateStr: string) => {
                            try {
                              const d = new Date(dateStr);
                              const options: Intl.DateTimeFormatOptions = {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                              };
                              const dateString = d.toLocaleDateString("fa-IR", options).replace(/\//g, "-");
                              const timeString = d.toLocaleTimeString("fa-IR", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              });
                              return { dateString, timeString };
                            } catch {
                              return { dateString: "-", timeString: "-" };
                            }
                          };

                          const createdFormatted = formatPersianDateTime(item.created_at);
                          // Edit time is either converted_at or customized offset for pristine demonstration
                          const editFormatted = formatPersianDateTime(item.converted_at || item.created_at);

                          return (
                            <tr
                              key={item.id}
                              className={`group divide-x divide-x-reverse divide-white/5 hover:bg-slate-900/40 transition-colors duration-150 ${
                                isRowChecked ? "bg-emerald-500/5" : isTargetSelected ? "bg-cyan-500/5" : ""
                              }`}
                            >
                              {/* 1. Checkbox Select Column */}
                              <td className="py-3 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isRowChecked}
                                  onChange={() => toggleSelectRow(item.id)}
                                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer w-3.5 h-3.5 mx-auto"
                                />
                              </td>

                              {/* 2. Star Toggle Favorite Indicator */}
                              <td className="py-3 px-2 text-center text-xs">
                                <button
                                  type="button"
                                  onClick={() => toggleStarLead(item.id, !!item.is_starred)}
                                  className={`transition-all duration-150 transform active:scale-125 focus:outline-none cursor-pointer ${
                                    item.is_starred
                                      ? "text-amber-400 scale-110"
                                      : "text-slate-600 hover:text-slate-400 scale-100"
                                  }`}
                                  title={item.is_starred ? "حذف از برگزیده‌ها" : "افزودن به برگزیده‌ها"}
                                >
                                  <Star className="w-4 h-4 mx-auto" fill={item.is_starred ? "currentColor" : "none"} strokeWidth={item.is_starred ? 1.5 : 2} />
                                </button>
                              </td>

                              {/* 3. Creation Time */}
                              <td className="py-3 px-3 text-center text-slate-300 font-medium whitespace-nowrap">
                                <div className="font-mono text-[10px] font-semibold text-slate-300">
                                  {createdFormatted.dateString}
                                </div>
                                <div className="text-[9px] text-slate-500 font-mono mt-0.5 font-medium">
                                  {createdFormatted.timeString}
                                </div>
                              </td>

                              {/* 4. Edit Time */}
                              <td className="py-3 px-3 text-center text-slate-400 font-medium whitespace-nowrap">
                                <div className="font-mono text-[10px] font-semibold text-slate-400">
                                  {editFormatted.dateString}
                                </div>
                                <div className="text-[9px] text-slate-500 font-mono mt-0.5 font-medium">
                                  {editFormatted.timeString}
                                </div>
                              </td>

                              {/* 5. Client Full Name */}
                              <td className="py-3 px-4 font-bold text-slate-200">
                                <button
                                  onClick={() => setSelectedLead(item)}
                                  className="flex items-center gap-1.5 hover:text-emerald-400 text-right w-full cursor-pointer transition-colors outline-none"
                                  title="مشاهده جزئیات پرونده و ثبت پیگیری جدید"
                                >
                                  <span>{item.full_name}</span>
                                  {item.is_starred && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  )}
                                </button>
                              </td>

                              {/* 6. Referral */}
                              <td className="py-3 px-4 text-slate-300 font-medium">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getBadgeColor(item.referral) }} />
                                  <span>{getBadgeLabel(item.referral)}</span>
                                </div>
                              </td>

                              {/* 7. Mobile Phone clickable */}
                              <td className="py-3 px-4 font-semibold">
                                <a
                                  href={`tel:${item.mobile}`}
                                  className="text-cyan-400 font-mono hover:underline hover:text-cyan-300 transition-colors"
                                  title="تماس مستقیم سریع"
                                >
                                  {item.mobile}
                                </a>
                              </td>

                              {/* 8. Lead Source */}
                              <td className="py-3 px-4">
                                <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-[10px] border border-white/5 font-extrabold whitespace-nowrap">
                                  {getBadgeLabel(item.lead_source)}
                                </span>
                              </td>

                              {/* 9. Key Service */}
                              <td className="py-3 px-4">
                                <span
                                  className="px-2 py-1 rounded text-[10px] border font-extrabold whitespace-nowrap"
                                  style={{
                                    borderColor: `${getBadgeColor(item.service)}33`,
                                    backgroundColor: `${getBadgeColor(item.service)}15`,
                                    color: getBadgeColor(item.service),
                                  }}
                                >
                                  {getBadgeLabel(item.service)}
                                </span>
                              </td>

                              {/* 10. Status Pill - Premium styling mimicking screenshot's solid thick pill badges */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedLead(item)}
                                  className="px-3 py-1 rounded-full text-[10px] font-extrabold border shadow-sm transition hover:scale-[1.03] active:scale-[0.98] whitespace-nowrap cursor-pointer mx-auto block"
                                  style={{
                                    borderColor: `${getBadgeColor(activeModule === "leads" ? item.lead_status : item.opportunity_status)}55`,
                                    backgroundColor: `${getBadgeColor(activeModule === "leads" ? item.lead_status : item.opportunity_status)}`,
                                    color: "#0f172a", // Dark contrast text on matching solid background
                                  }}
                                >
                                  {getBadgeLabel(activeModule === "leads" ? item.lead_status : item.opportunity_status)}
                                </button>
                              </td>

                              {/* 11. Challenge / Request Content with complete lines */}
                              <td className="py-3 px-4 max-w-[280px]">
                                <div className="text-slate-300 leading-relaxed truncate text-justify" title={item.request_challenge}>
                                  {item.request_challenge}
                                </div>
                              </td>

                              {/* 12. SMS Text */}
                              <td className="py-3 px-4 max-w-[200px]">
                                <p className="text-slate-400 italic truncate text-[10px] line-clamp-1" title={item.sms_text || "بدون پیامک"}>
                                  {item.sms_text || "—"}
                                </p>
                              </td>

                              {/* 13. Operations column */}
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingLead(item);
                                      setModalType(activeModule === "leads" ? "lead" : "opportunity");
                                      setIsModalOpen(true);
                                    }}
                                    className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded border border-white/5 hover:border-white/10 transition cursor-pointer"
                                    title="ویرایش سریع فیلدها"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Only Admin role can delete leads to guard integrity */}
                                  {activeUser.role === "admin" && (
                                    <button
                                      onClick={() => handleDeleteLead(item.id)}
                                      className="p-1 hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 rounded transition cursor-pointer"
                                      title="حذف کامل پرونده"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* 2. Beautiful Kanban card/bento grid view */
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" id="records-results-grid">
                    {filteredRecords.map((item) => {
                      const isTargetSelected = selectedLead?.id === item.id;
                      const isRowChecked = selectedRowIds.includes(item.id);
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className={`p-4 bg-slate-900/20 border rounded-2xl text-right flex flex-col justify-between transition-all duration-300 relative ${
                            isRowChecked
                              ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/10 shadow-lg"
                              : isTargetSelected
                              ? "border-emerald-500/40 bg-slate-900/40 ring-1 ring-emerald-500/10 shadow-lg"
                              : "border-white/5 hover:border-white/10 hover:bg-slate-900/30"
                          }`}
                          id={`lead-card-${item.id}`}
                        >
                          <div className="space-y-3">
                            {/* Card top banner row */}
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="checkbox"
                                  checked={isRowChecked}
                                  onChange={() => toggleSelectRow(item.id)}
                                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer w-3.5 h-3.5"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleStarLead(item.id, !!item.is_starred)}
                                  className={`transition-colors cursor-pointer ${item.is_starred ? "text-amber-400" : "text-slate-600 hover:text-slate-400"}`}
                                >
                                  <Star className="w-3.5 h-3.5 font-extrabold" fill={item.is_starred ? "currentColor" : "none"} />
                                </button>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {new Date(item.created_at).toLocaleDateString("fa-IR")}
                                </span>
                              </div>
                              
                              {/* Colored Status Badges */}
                              <button
                                onClick={() => setSelectedLead(item)}
                                className="text-[10px] px-2 py-0.5 rounded-lg font-bold border hover:opacity-85 transition cursor-pointer"
                                style={{
                                  borderColor: `${getBadgeColor(activeModule === "leads" ? item.lead_status : item.opportunity_status)}44`,
                                  backgroundColor: `${getBadgeColor(activeModule === "leads" ? item.lead_status : item.opportunity_status)}15`,
                                  color: getBadgeColor(activeModule === "leads" ? item.lead_status : item.opportunity_status),
                                }}
                              >
                                {getBadgeLabel(activeModule === "leads" ? item.lead_status : item.opportunity_status)}
                              </button>
                            </div>

                            {/* Client identity detail */}
                            <div>
                              <button
                                onClick={() => setSelectedLead(item)}
                                className="text-right w-full hover:text-emerald-400 transition-colors cursor-pointer outline-none block"
                              >
                                <h3 className="text-sm font-bold text-slate-200">{item.full_name}</h3>
                              </button>
                              {item.mobile && (
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.mobile}</p>
                              )}
                            </div>

                            {/* Referral and Source tags */}
                            <div className="flex flex-wrap gap-1.5 text-[10px]">
                              {item.referral && (
                                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-white/5 flex items-center gap-1">
                                  <span>ارجاع:</span>
                                  <strong className="text-cyan-400">{getBadgeLabel(item.referral)}</strong>
                                </span>
                              )}
                              {item.lead_source && (
                                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-white/5">
                                  منبع: {getBadgeLabel(item.lead_source)}
                                </span>
                              )}
                            </div>

                            {/* Financial representation for Opportunities */}
                            {activeModule === "opportunities" && item.price && (
                              <div className="p-2 bg-cyan-950/20 border border-cyan-500/10 rounded-xl text-xs flex items-center justify-between">
                                <span className="text-slate-400">ارزش کل پروژه:</span>
                                <strong className="text-cyan-300 font-mono">{Number(item.price).toLocaleString("fa-IR")} تومان</strong>
                              </div>
                            )}

                            {/* Challenge fragment */}
                            {item.request_challenge && (
                              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 bg-slate-950/20 p-2 rounded-xl text-justify border border-white/5">
                                {item.request_challenge}
                              </p>
                            )}
                          </div>

                          {/* Action Button trigger bar */}
                          <div className="border-t border-white/5 pt-3 mt-4 flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedLead(item)}
                                className="text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition"
                                title="پیگیری فعالیت‌ها و یادداشت‌ها"
                              >
                                پرونده و پیگیری
                              </button>
                              
                              <button
                                onClick={() => {
                                  setEditingLead(item);
                                  setModalType(activeModule === "leads" ? "lead" : "opportunity");
                                  setIsModalOpen(true);
                                }}
                                className="p-1 hover:bg-slate-800 border border-white/5 hover:border-white/15 text-slate-300 rounded-lg cursor-pointer transition overflow-visible"
                                title="ویرایش عمومی"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Lead conversion option */}
                              {activeModule === "leads" && (
                                <button
                                  onClick={() => handleConvertLeadToOpportunity(item)}
                                  className="text-[10px] font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 transition"
                                >
                                  <ArrowLeftRight className="w-3 h-3" />
                                  <span>تبدیل</span>
                                </button>
                              )}

                              {/* Only Admin role can delete leads to guard integrity */}
                              {activeUser.role === "admin" && (
                                <button
                                  onClick={() => handleDeleteLead(item.id)}
                                  className="p-1.5 hover:bg-rose-500/15 text-rose-400 rounded-lg cursor-pointer transition overflow-visible border border-transparent hover:border-rose-500/10"
                                  title="حذف کامل سرنخ"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* View 3: Activities Calendar */}
            {activeModule === "calendar" && (
              <ActivityCalendar
                onSelectLead={(leadId) => {
                  const leadMatch = leads.find((l) => l.id === leadId);
                  if (leadMatch) {
                    setSelectedLead(leadMatch);
                    // Match visual active panel view to lead module type
                    setActiveModule(leadMatch.module_type === "lead" ? "leads" : "opportunities");
                  }
                }}
                onRefresh={handleRefresh}
              />
            )}

             {/* View 4: Consolidated Admin Management Panel */}
            {activeModule === "management" && (
              activeUser?.role === "admin" ? (
                <ManagementPanel activeUser={activeUser} onRefreshData={handleRefresh} />
              ) : (
                <div className="glass-panel p-8 text-center text-rose-500 font-extrabold border border-rose-500/10 rounded-2xl">
                  ⚠️ شما دسترسی کافی به بخش پنل مدیریت را ندارید. فقط مدیر ارشد مجاز به مدیریت اطلاعات پایه است.
                </div>
              )
            )}

            {/* View 5: Installments tracking and cash sales breakdown */}
            {activeModule === "installments" && (
              <InstallmentSales leads={leads} dropdowns={dropdowns} onRefreshData={handleRefresh} />
            )}

          </div>

        </section>

          </>
        )}

      </main>

      {/* Main interactive lead modal picker popup */}
      {isModalOpen && (
        <LeadModal
          lead={editingLead}
          moduleType={modalType}
          activeUser={activeUser}
          onClose={() => {
            setIsModalOpen(false);
            setEditingLead(null);
          }}
          onSave={handleRefresh}
        />
      )}

      {/* Real-time Alarm Popups Container */}
      <div className="fixed bottom-6 right-6 space-y-3 z-[10002] max-w-sm w-full" dir="rtl">
        {activeAlarms.map((alarm) => (
          <div
            key={alarm.id}
            className="bg-slate-900/95 backdrop-blur border-2 border-amber-500/50 p-4 rounded-xl shadow-2xl space-y-3 text-right animate-slideIn"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>یادآوری فعالیت بسیار فوری!</span>
              </span>
              <button
                onClick={() => {
                  setActiveAlarms((prev) => prev.filter((a) => a.id !== alarm.id));
                }}
                className="text-slate-400 hover:text-white transition cursor-pointer text-xs font-black p-0.5"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed font-semibold">
              زمان تعیین‌شده برای فعالیت پیگیری زیر فرارسیده است:
              <br />
              <strong className="text-white bg-amber-500/10 px-1 py-0.5 rounded mt-1.5 inline-block border border-amber-500/20">
                {alarm.title}
              </strong>
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  CRMDatabase.toggleActivityDone(alarm.id);
                  setActiveAlarms((prev) => prev.filter((a) => a.id !== alarm.id));
                  handleRefresh();
                }}
                className="px-3 py-1.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold cursor-pointer transition shadow"
              >
                انجام شد
              </button>
              <button
                onClick={() => {
                  const leadMatch = leads.find((l) => l.id === alarm.leadId);
                  if (leadMatch) {
                    setSelectedLead(leadMatch);
                    setActiveModule(leadMatch.module_type === "lead" ? "leads" : "opportunities");
                  }
                  setActiveAlarms((prev) => prev.filter((a) => a.id !== alarm.id));
                }}
                className="px-3 py-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition"
              >
                مشاهده پرونده
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Global Confirmation Dialog */}
      {modalConfirmAction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10001] flex items-center justify-center p-4 animate-fadeIn" id="custom-confirm-popup" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full p-5 rounded-2xl shadow-2xl text-right space-y-4">
            <h3 className="text-xs font-black text-rose-400 flex items-center gap-2 border-b border-white/5 pb-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>تایید حذف رکورد سیستم</span>
            </h3>
            <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
              {modalConfirmAction.message}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setModalConfirmAction(null)}
                className="px-3.5 py-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition"
              >
                انصراف
              </button>
              <button
                onClick={() => {
                  modalConfirmAction.onConfirm();
                  setModalConfirmAction(null);
                }}
                className="px-3.5 py-1.5 text-[10px] bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold cursor-pointer transition shadow"
              >
                تایید نهایی و حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
