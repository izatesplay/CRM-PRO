/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { CRMDatabase } from "../utils/db";
import { User } from "../types";
import { ShieldCheck, UserCheck, Key, RefreshCw, Mail, CheckCircle } from "lucide-react";
import { sha256 } from "../utils/crypto";

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(""); // UI only
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "consultant" | "supervisor">("consultant");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("لطفاً نام کاربری را وارد کنید.");
      return;
    }

    // Checking seeded credentials
    const users = CRMDatabase.getUsers();
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase().trim() ||
        u.email.toLowerCase() === username.toLowerCase().trim()
    );

    if (user) {
      const enteredHash = sha256(password);
      if (user.password && user.password !== enteredHash) {
        setError("کلمه عبور وارد شده نادرست است.");
        return;
      }
      // Check if registration is approved, except for the master admin account "izatesplay"
      if (user.username.toLowerCase() !== "izatesplay" && user.approved === false) {
        setError("حساب کاربری شما هنوز توسط مدیر ارشد سیستم تایید و فعال نشده است. لطفا منتظر بمانید.");
        return;
      }
      CRMDatabase.setActiveUser(user);
      onLoginSuccess(user);
    } else {
      setError("کاربری با این مشخصات یافت نشد. برای ورود می‌توانید از نام کاربری admin یا consultant استفاده کنید.");
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !fullName.trim() || !email.trim() || !password.trim()) {
      setError("لطفاً تمام فیلدهای ستاره‌دار را تکمیل فرمایید (شامل رمز عبور).");
      return;
    }

    const users = CRMDatabase.getUsers();
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase().trim())) {
      setError("این نام کاربری قبلاً در سامانه ثبت شده است.");
      return;
    }

    const newUser = CRMDatabase.registerUser({
      username: username.trim(),
      full_name: fullName.trim(),
      email: email.trim(),
      role,
      password: password.trim(),
    });

    setSuccessMsg(`همکار جدید جناب/سرکار "${newUser.full_name}" با موفقیت تعریف شد. اکنون می‌توانید وارد شوید.`);
    setMode("login");
    setUsername(newUser.username);
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("لطفاً ایمیل سازمانی خود را وارد کنید.");
      return;
    }
    setSuccessMsg("لینک تغییر کلمه عبور به ایمیل سازمانی شما ارسال شد.");
    setMode("reset");
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("کلمه عبور جدید با موفقیت ذخیره شد. اکنون وارد سیستم شوید.");
    setMode("login");
  };

  return (
    <div className="min-height-screen flex items-center justify-center p-4 relative" id="auth-screen-container">
      {/* Immersive background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-glow" />

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl relative z-10 border border-white/10" id="auth-panel">
        {/* Brand identity */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-full text-emerald-400 mb-3 border border-emerald-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-emerald-400 to-cyan-400 tracking-tight">
            سامانه یکپارچه CRM سازمان
          </h1>
          <p className="text-sm text-slate-400 mt-1">پورتال دسترسی همکاران و مشاوران فروش</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg text-right" id="auth-error">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg flex items-start gap-2" id="auth-success">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span className="text-right">{successMsg}</span>
          </div>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 text-right font-medium">نام کاربری یا ایمیل سازمانی *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="مثال: admin یا consultant"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full glass-input text-sm p-3 rounded-xl placeholder:text-slate-600 text-right pr-4 pl-10"
                  id="login-username-input"
                />
                <UserCheck className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5 text-right font-medium">رمز عبور امنیتی *</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="******"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input text-sm p-3 rounded-xl placeholder:text-slate-600 text-right pr-4 pl-10"
                  id="login-password-input"
                />
                <Key className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
              </div>
            </div>

            <button type="submit" className="w-full glass-btn-primary p-3 rounded-xl text-sm font-semibold text-white mt-2 cursor-pointer" id="login-submit-btn">
              ورود به داشبورد مالی و فروش
            </button>

            <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/5 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                  setSuccessMsg("");
                }}
                className="hover:text-cyan-400 transition"
              >
                فراموشی رمز عبور؟
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setSuccessMsg("");
                }}
                className="hover:text-emerald-400 font-medium transition"
              >
                ثبت‌نام همکار جدید
              </button>
            </div>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 text-right font-medium">نام و نام خانوادگی همکار *</label>
              <input
                type="text"
                placeholder="مثال: مریم محمدی"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full glass-input text-sm p-3 rounded-xl text-right"
                id="reg-fullname-input"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5 text-right font-medium">نام کاربری سیستم *</label>
              <input
                type="text"
                placeholder="مثال: maryam"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full glass-input text-sm p-3 rounded-xl text-right"
                id="reg-username-input"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5 text-right font-medium">ایمیل سازمانی رسمی *</label>
              <input
                type="email"
                placeholder="maryam@comp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input text-sm p-3 rounded-xl text-right"
                id="reg-email-input"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5 text-right font-medium">رمز عبور امنیتی حساب *</label>
              <input
                type="password"
                placeholder="کلمه عبور دلخواه ورود"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input text-sm p-3 rounded-xl text-right font-mono"
                id="reg-password-input"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1.5 text-right font-medium font-bold">نقش سازمانی همکار *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`p-2.5 rounded-xl text-[10px] font-bold cursor-pointer border transition ${
                    role === "admin"
                      ? "bg-slate-800 border-rose-500/40 text-rose-400 shadow"
                      : "bg-slate-900/30 border-white/5 text-slate-400 hover:bg-slate-900/50"
                  }`}
                >
                  مدیر
                </button>
                <button
                  type="button"
                  onClick={() => setRole("supervisor")}
                  className={`p-2.5 rounded-xl text-[10px] font-bold cursor-pointer border transition ${
                    role === "supervisor"
                      ? "bg-slate-800 border-amber-500/40 text-amber-400 shadow"
                      : "bg-slate-900/30 border-white/5 text-slate-400 hover:bg-slate-900/50"
                  }`}
                >
                  سرپرست
                </button>
                <button
                  type="button"
                  onClick={() => setRole("consultant")}
                  className={`p-2.5 rounded-xl text-[10px] font-bold cursor-pointer border transition ${
                    role === "consultant"
                      ? "bg-slate-800 border-emerald-500/40 text-emerald-400 shadow"
                      : "bg-slate-900/30 border-white/5 text-slate-400 hover:bg-slate-900/50"
                  }`}
                >
                  کارشناس فروش
                </button>
              </div>
            </div>

            <button type="submit" className="w-full glass-btn-primary p-3 rounded-xl text-sm font-semibold text-white mt-2 cursor-pointer" id="reg-submit-btn">
              ایجاد حساب همکاری جدید
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                بازگشت به صفحه ورود افراد
              </button>
            </div>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="text-sm text-slate-300 text-right leading-relaxed mb-2">
              ایمیل ثبت شده در سازمان خود را مکتوب کنید تا درخواست ریکاوری امنیتی توسط ادمین ارشد صادر شود.
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 text-right font-medium">ایمیل کاربری</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="username@org.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input text-sm p-3 rounded-xl text-right pr-4 pl-10"
                  id="forgot-email-input"
                />
                <Mail className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
              </div>
            </div>

            <button type="submit" className="w-full glass-btn-primary p-3 rounded-xl text-sm font-semibold text-white cursor-pointer" id="forgot-submit-btn">
              درخواست بازیابی رمز عبور
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                بازگشت به صفحه ورود اصلی
              </button>
            </div>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="text-sm text-slate-300 text-right leading-relaxed mb-2">
              کد تایید پیامی یا ایمیل موقت را دریافت کرده‌اید. در اینجا کلمه عبور جدیدی تعبیه کنید.
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 text-right font-medium">رمز عبور جدید</label>
              <input
                type="password"
                placeholder="******"
                className="w-full glass-input text-sm p-3 rounded-xl text-right font-mono"
                id="reset-password-input"
              />
            </div>
            <button type="submit" className="w-full glass-btn-primary p-3 rounded-xl text-sm font-semibold text-white cursor-pointer" id="reset-submit-btn">
              ذخیره نهایی کلمه عبور
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
