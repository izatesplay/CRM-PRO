/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, Lead } from "../types";
import { CRMDatabase } from "../utils/db";
import { Upload, HelpCircle, ArrowLeft, RefreshCw, Layers, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface ExcelImporterProps {
  activeUser: User;
  onImportComplete: () => void;
  onCancel: () => void;
}

interface ParsedRow {
  [key: number]: string;
}

export default function ExcelImporter({ activeUser, onImportComplete, onCancel }: ExcelImporterProps) {
  const [rawText, setRawText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [step, setStep] = useState<"paste" | "mapping">("paste");

  // Mapping state: which excel column index maps to which database key
  const [fullnameIndex, setFullnameIndex] = useState<number>(-1);
  const [mobileIndex, setMobileIndex] = useState<number>(-1);
  const [challengeIndex, setChallengeIndex] = useState<number>(-1);
  const [smsIndex, setSmsIndex] = useState<number>(-1);

  // Default dropdown field placeholders for bulk leads
  const [defaultReferral, setDefaultReferral] = useState("");
  const [defaultSource, setDefaultSource] = useState("");
  const [defaultService, setDefaultService] = useState("");
  const [defaultStatus, setDefaultStatus] = useState("");

  const [message, setMessage] = useState("");
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [duplicateCount, setDuplicateCount] = useState<number>(0);

  const dropdowns = CRMDatabase.getDropdowns();
  const referralList = dropdowns.filter((o) => o.category === "referral");
  const sourceList = dropdowns.filter((o) => o.category === "lead_source");
  const serviceList = dropdowns.filter((o) => o.category === "service");
  const statusList = dropdowns.filter((o) => o.category === "lead_status");

  // Function to parse spreadsheet copy-pasted text (supports tab-separated Excel and comma/semicolon CSV)
  const handleParseText = () => {
    setMessage("");
    if (!rawText.trim()) {
      setMessage("لطفاً ابتدا متنی را کپی کرده یا فایل متنی حاوی اطلاعات را بارگذاری کنید.");
      return;
    }

    // Split text into lines
    const lines = rawText.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length === 0) {
      setMessage("هیچ خط معتبری جهت پردازش اطلاعات یافت نشد.");
      return;
    }

    // Detect delimiter: tab for excel copy/paste, comma for CSV, semicolon
    const firstLine = lines[0];
    let delimiter = "\t";
    if (firstLine.includes(",")) delimiter = ",";
    else if (firstLine.includes(";")) delimiter = ";";

    const allRowsParsed: ParsedRow[] = [];
    let detectedHeaders: string[] = [];

    // Parse column names and data rows
    lines.forEach((line, index) => {
      // Handle potential CSV quoted items simply
      const columns = line.split(delimiter).map(col => col.trim().replace(/^["']|["']$/g, ""));
      if (index === 0) {
        detectedHeaders = columns;
      } else {
        const rowObj: ParsedRow = {};
        columns.forEach((colVal, colIdx) => {
          rowObj[colIdx] = colVal;
        });
        allRowsParsed.push(rowObj);
      }
    });

    if (detectedHeaders.length === 0) {
      setMessage("ستون‌های سربرگ فابل شناسایی نیستند.");
      return;
    }

    setHeaders(detectedHeaders);
    setParsedRows(allRowsParsed);

    // Dynamic Keyword intelligence - Try to pre-guess column indexes to save user time!
    detectedHeaders.forEach((h, idx) => {
      const hLower = h.toLowerCase();
      if (hLower.includes("نام") || hLower.includes("name") || hLower.includes("مشتری")) {
        setFullnameIndex(idx);
      } else if (hLower.includes("تلفن") || hLower.includes("موبایل") || hLower.includes("mobile") || hLower.includes("phone")) {
        setMobileIndex(idx);
      } else if (hLower.includes("چالش") || hLower.includes("توضیح") || hLower.includes("شرح") || hLower.includes("challenge")) {
        setChallengeIndex(idx);
      } else if (hLower.includes("پیامک") || hLower.includes("sms")) {
        setSmsIndex(idx);
      }
    });

    // Auto default statuses
    if (statusList.length > 0) setDefaultStatus(statusList[0].id);

    setStep("mapping");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isXlsx = fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv");

    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const sheetData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
          
          if (sheetData.length === 0) {
            setMessage("فایل بارگذاری شده خالی است یا فرمت نامعتبر دارد.");
            return;
          }

          // Row 0 is the header
          const rawHeaders = sheetData[0] || [];
          const detectedHeaders = rawHeaders.map((h) => String(h || "").trim());

          const allRowsParsed: ParsedRow[] = [];
          for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i] || [];
            const rowObj: ParsedRow = {};
            detectedHeaders.forEach((_, colIdx) => {
              rowObj[colIdx] = String(row[colIdx] ?? "").trim();
            });
            allRowsParsed.push(rowObj);
          }

          setHeaders(detectedHeaders);
          setParsedRows(allRowsParsed);

          // Dynamic Keyword intelligence - Try to pre-guess column indexes to save user time!
          detectedHeaders.forEach((h, idx) => {
            const hLower = h.toLowerCase();
            if (hLower.includes("نام") || hLower.includes("name") || hLower.includes("مشتری")) {
              setFullnameIndex(idx);
            } else if (hLower.includes("تلفن") || hLower.includes("موبایل") || hLower.includes("mobile") || hLower.includes("phone")) {
              setMobileIndex(idx);
            } else if (hLower.includes("چالش") || hLower.includes("توضیح") || hLower.includes("شرح") || hLower.includes("challenge")) {
              setChallengeIndex(idx);
            } else if (hLower.includes("پیامک") || hLower.includes("sms")) {
              setSmsIndex(idx);
            }
          });

          if (statusList.length > 0) setDefaultStatus(statusList[0].id);

          setStep("mapping");
        } catch (error) {
          console.error("Error parsing xlsx file via library:", error);
          setMessage("خطا در خواندن فایل اکسل. لطفاً از درستی ساختار جداول مطمئن شوید.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setRawText(String(evt.target.result));
        }
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  const handleExecuteImport = () => {
    setMessage("");
    if (fullnameIndex === -1) {
      setMessage("تعیین ستون مربوط به 'نام و نام خانوادگی' اجباری است.");
      return;
    }

    const currentLeads = [...CRMDatabase.getLeads()];
    let successes = 0;
    let duplicates = 0;
    let failedRows = 0;

    parsedRows.forEach((row) => {
      const parsedFullname = row[fullnameIndex];
      if (!parsedFullname || !parsedFullname.trim()) {
        failedRows++;
        return; // skip empty rows
      }

      const parsedMobile = mobileIndex !== -1 ? (row[mobileIndex] || "") : "";
      const parsedChallenge = challengeIndex !== -1 ? (row[challengeIndex] || "") : "";
      const parsedSms = smsIndex !== -1 ? (row[smsIndex] || "") : "";

      // Clean mobile format briefly
      let cleanedMobile = parsedMobile.replace(/\s/g, "");
      if (cleanedMobile && !cleanedMobile.startsWith("0")) {
        if (cleanedMobile.startsWith("9")) cleanedMobile = "0" + cleanedMobile;
      }

      // Skip duplicate phone numbers
      if (cleanedMobile && currentLeads.some(l => l.mobile && l.mobile.replace(/\s/g, "") === cleanedMobile)) {
        duplicates++;
        return; 
      }

      // Add Lead
      const newLead = CRMDatabase.addLead({
        full_name: parsedFullname.trim(),
        mobile: cleanedMobile.trim(),
        referral: defaultReferral,
        lead_source: defaultSource,
        service: defaultService,
        sub_service: "", // left empty for bulk updates manually
        lead_status: defaultStatus || (statusList[0]?.id || ""),
        request_challenge: parsedChallenge.trim() || "وارد شده به صورت گروهی از فایل اکسل/جدول",
        sms_text: parsedSms.trim(),
        module_type: "lead"
      }, activeUser);

      currentLeads.push(newLead);
      successes++;
    });

    setSuccessCount(successes);
    setDuplicateCount(duplicates);

    // Save Bulk import notification trace
    CRMDatabase.addNotification({
      user_id: activeUser.id,
      title: "عملیات ورود گروهی موفق",
      message: `تعداد ${successes} پرونده با موفقیت افزوده گردید و ${duplicates} شماره تکراری نادیده گرفته شد.`,
      notification_type: "assignment",
      is_read: false
    });

    setTimeout(() => {
      onImportComplete();
    }, 3000);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl text-right max-w-4xl mx-auto" id="excel-importer-container">
      <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
        <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
          <Upload className="w-5 h-5 animate-bounce" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">درون‌ریزی امن و گروهی سرنخ‌های معلق (Excel / CSV)</h2>
          <p className="text-xs text-slate-400">اطلاعات را سریعتر از صفحات گسترده مالی با کپی پیست نقشه برداری کنید</p>
        </div>
      </div>

      {successCount !== null ? (
        <div className="p-8 text-center space-y-3" id="import-success-block">
          <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h3 className="text-base font-bold text-emerald-400">عملیات درون‌ریزی گروهی به پایان رسید!</h3>
          <p className="text-xs text-slate-300">
            تعداد <strong className="text-emerald-400">{successCount} سرنخ جدید</strong> با موفقیت پردازش و درون‌ریزی شد.
          </p>
          {duplicateCount > 0 && (
            <p className="text-xs text-amber-400">
              ⚠️ تعداد <strong>{duplicateCount} رکورد</strong> به دلیل دارا بودن شماره موبایل تکراری نادیده گرفته شد.
            </p>
          )}
          <p className="text-[10px] text-slate-500">در حال هدایت به بخش سرنخ‌ها...</p>
        </div>
      ) : (
        <>
          {step === "paste" && (
            <div className="space-y-4">
              <div className="p-3 bg-cyan-950/20 rounded-xl border border-cyan-500/10 text-xs text-slate-300 leading-relaxed">
                💡 <strong>روش کپی پیست راحت:</strong> شما می‌توانید به سادگی سطرهای جدول داده Excel را انتخاب و کپی (Ctrl+C) کرده و مستقیماً در کادر زیر جایگذاری (Ctrl+V) کنید! سیستم به طور هوشمند ستون‌ها را تفکیک خواهد کرد.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">محتوای متنی جدول یا فایل CSV کپی شده</label>
                <textarea
                  placeholder="سربرگ و رکوردهای خود را اینجا بچسبانید..."
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full glass-input text-xs p-3 rounded-xl text-right font-mono resize-none leading-relaxed"
                  id="paste-area-input"
                />
              </div>

              {/* Upload file triggers */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span>یا فایل اکسل (xlsx, xls) یا متنی (csv) آپلود کنید:</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={handleFileUpload}
                    className="text-xs text-slate-400 bg-slate-900/50 p-1 rounded-lg border border-white/5 cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onCancel}
                    className="glass-btn-secondary text-xs px-4 py-2.5 rounded-lg text-slate-300 cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    onClick={handleParseText}
                    className="glass-btn-primary text-xs px-5 py-2.5 rounded-lg text-white font-semibold cursor-pointer"
                    id="parse-data-btn"
                  >
                    مرحله بعد (تحلیل ستون‌ها)
                  </button>
                </div>
              </div>

              {message && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg">
                  ⚠️ {message}
                </div>
              )}
            </div>
          )}

          {step === "mapping" && (
            <div className="space-y-6">
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs text-slate-300">
                ✔️ تعداد <strong>{parsedRows.length} سطر اطلاعات عمومی</strong> شناسایی شد. ستون‌های اکسل خود را به فیلدهای CRM متصل کنید.
              </div>

              {/* Mapper selects panel */}
              <div className="p-4 bg-slate-900/30 rounded-xl border border-white/5 space-y-4">
                <span className="text-xs font-bold text-cyan-400">مکانیسم نگاشت ستون‌های جدول اکسل به فیلدهای سامانه</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">نام و نام خانوادگی مشتری * (اجباری)</label>
                    <select
                      value={fullnameIndex}
                      onChange={(e) => setFullnameIndex(Number(e.target.value))}
                      className="w-full glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer"
                      id="map-fullname-select"
                    >
                      <option value={-1}>-- انتخاب کنید --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          ستون {i + 1}: "{h}"
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">شماره همراه / موبایل</label>
                    <select
                      value={mobileIndex}
                      onChange={(e) => setMobileIndex(Number(e.target.value))}
                      className="w-full glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer"
                      id="map-mobile-select"
                    >
                      <option value={-1}>-- نادیده گرفتن --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          ستون {i + 1}: "{h}"
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">شرح درخواست یا چالش کلاینت</label>
                    <select
                      value={challengeIndex}
                      onChange={(e) => setChallengeIndex(Number(e.target.value))}
                      className="w-full glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer"
                      id="map-challenge-select"
                    >
                      <option value={-1}>-- نادیده گرفتن --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          ستون {i + 1}: "{h}"
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">متن پیامک پیش‌نویسی ارسالی</label>
                    <select
                      value={smsIndex}
                      onChange={(e) => setSmsIndex(Number(e.target.value))}
                      className="w-full glass-input text-xs p-2.5 rounded-xl bg-slate-950 text-right cursor-pointer"
                      id="map-sms-select"
                    >
                      <option value={-1}>-- نادیده گرفتن --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          ستون {i + 1}: "{h}"
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Default values selection */}
              <div className="p-4 bg-slate-900/10 rounded-xl border border-white/5 space-y-4">
                <span className="text-xs font-bold text-slate-300">مقادیر پیش‌فرض برای تمامی رکوردهای اکسل وارد شده</span>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-right">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">ارجاع پیش‌فرض به</label>
                    <select
                      value={defaultReferral}
                      onChange={(e) => setDefaultReferral(e.target.value)}
                      className="w-full glass-input text-[11px] p-2 rounded-lg bg-slate-950 text-right cursor-pointer"
                    >
                      <option value="">-- هیچکدام --</option>
                      {referralList.map((rf) => (
                        <option key={rf.id} value={rf.id}>
                          {rf.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">منبع پیش‌فرض</label>
                    <select
                      value={defaultSource}
                      onChange={(e) => setDefaultSource(e.target.value)}
                      className="w-full glass-input text-[11px] p-2 rounded-lg bg-slate-950 text-right cursor-pointer"
                    >
                      <option value="">-- انتخاب --</option>
                      {sourceList.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">سرویس پیشنهادی</label>
                    <select
                      value={defaultService}
                      onChange={(e) => setDefaultService(e.target.value)}
                      className="w-full glass-input text-[11px] p-2 rounded-lg bg-slate-950 text-right cursor-pointer"
                    >
                      <option value="">-- هیچکدام --</option>
                      {serviceList.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">وضعیت اولیه</label>
                    <select
                      value={defaultStatus}
                      onChange={(e) => setDefaultStatus(e.target.value)}
                      className="w-full glass-input text-[11px] p-2 rounded-lg bg-slate-950 text-right cursor-pointer"
                    >
                      {statusList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {message && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg">
                  ⚠️ {message}
                </div>
              )}

              {/* Actions footer */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <button
                  onClick={() => setStep("paste")}
                  className="glass-btn-secondary text-xs px-3 py-2 rounded-lg text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>بازگشت به متن ورودی</span>
                </button>

                <button
                  onClick={handleExecuteImport}
                  className="glass-btn-primary text-xs px-5 py-2.5 rounded-lg text-white font-bold cursor-pointer"
                >
                  تایید نهایی و درون‌ریزی گروهی اطلاعات
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
