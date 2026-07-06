import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { Phone, ArrowRight, ShieldCheck, HelpCircle, Activity, Stethoscope, Syringe, BarChart2, Mail, Eye, EyeOff, Smartphone, User } from "lucide-react";
import PulseDivider from "../components/PulseDivider";

export default function Login() {
  const { login, isLoggedIn, user } = useSession();
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState<"patient" | "staff">("patient");
  const [role, setRole] = useState<"doctor" | "nurse" | "admin">("doctor");

  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [nurseOtp, setNurseOtp] = useState(["", "", "", "", "", ""]);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Patient / Nurse phone step
  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
    }, 800);
  };

  const handlePatientVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length < 4) {
      setError("Please enter the 4-digit code.");
      return;
    }
    setError("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      login(`+91 ${phone}`, "Ramesh Kumar", "patient");
      navigate("/home");
    }, 1000);
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login("staff@anvaya.in", role === "doctor" ? "Dr. Priya Sharma" : role === "nurse" ? "ANM Kamla Devi" : "District Admin", role);
      navigate("/hospital");
    }, 1000);
  };

  const demoLogin = (demoRole: "patient" | "doctor" | "nurse" | "admin") => {
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (demoRole === "patient") {
        login("+91 9876543210", "Ramesh Kumar", "patient");
        navigate("/home");
      } else {
        login("staff@anvaya.in", demoRole === "doctor" ? "Dr. Priya Sharma" : demoRole === "nurse" ? "ANM Kamla Devi" : "District Admin", demoRole);
        navigate("/hospital");
      }
    }, 800);
  };

  const renderPatientLogin = () => (
    <>
      <div className="text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 font-display text-2xl text-white shadow-md shadow-teal-500/20">
          अ
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-teal-700">Anvaya Login</h1>
        <p className="mt-1.5 text-sm text-ink/60">आरोग्यमित्र — आपकी सेहत, आपकी भाषा में</p>
      </div>

      <PulseDivider className="my-6 opacity-45" />

      {step === "phone" ? (
        <form onSubmit={handlePhoneSubmit} className="space-y-5">
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-ink">
              Enter Mobile Number
            </label>
            <p className="text-xs text-ink/50 mb-2">Login or register via SMS OTP. No password needed.</p>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-medium text-ink/40">
                +91
              </span>
              <input
                id="phone"
                type="tel"
                placeholder="98765 43210"
                className="w-full rounded-lg border border-ink/20 bg-paper py-3 pl-12 pr-4 text-base text-ink placeholder-ink/40 focus:border-teal-500 focus:outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                disabled={loading}
              />
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-tier-red">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full min-h-touch items-center justify-center gap-2 rounded-lg bg-teal-500 font-semibold text-white shadow-md shadow-teal-500/10 hover:bg-teal-600 transition-colors disabled:opacity-70"
          >
            {loading ? "Sending OTP..." : "Get Verification Code"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <form onSubmit={handlePatientVerify} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-ink text-center">
              Verify Mobile Number
            </label>
            <p className="text-xs text-ink/50 text-center mb-4">
              We sent a 4-digit code to <span className="font-semibold text-ink/80">+91 {phone}</span>.
              <button
                type="button"
                className="ml-1 text-teal-600 underline hover:text-teal-700"
                onClick={() => setStep("phone")}
              >
                Change
              </button>
            </p>

            <div className="flex justify-center gap-3">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-${idx}`}
                  type="text"
                  maxLength={1}
                  className="h-14 w-12 rounded-lg border border-ink/20 bg-paper text-center text-xl font-bold text-teal-700 focus:border-teal-500 focus:outline-none"
                  value={digit}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isNaN(Number(val))) return;
                    const newOtp = [...otp];
                    newOtp[idx] = val.substring(val.length - 1);
                    setOtp(newOtp);
                    if (val && idx < 3) document.getElementById(`otp-${idx + 1}`)?.focus();
                  }}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-tier-red text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full min-h-touch items-center justify-center gap-2 rounded-lg bg-teal-500 font-semibold text-white shadow-md shadow-teal-500/10 hover:bg-teal-600 transition-colors disabled:opacity-70"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>
        </form>
      )}

      <div className="mt-8 flex flex-col gap-3 rounded-lg bg-teal-50/50 p-4 text-xs text-teal-700">
        <div className="flex gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0 text-teal-500" />
          <p>
            <strong>Data Privacy & Security:</strong> We comply with India's DPDP Act 2023. All scans and vitals require explicit consent before saving.
          </p>
        </div>
        <div className="flex gap-2">
          <HelpCircle className="h-4 w-4 shrink-0 text-teal-500" />
          <p>
            Use OTP code <strong className="underline text-teal-800">1234</strong> to verify immediately.
          </p>
        </div>
      </div>
    </>
  );

  const renderStaffLogin = () => (
    <>
      <div className="text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 font-display text-2xl text-white shadow-md shadow-teal-500/20">
          <Activity className="h-8 w-8 text-white" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-teal-700">Hospital Panel</h1>
        <p className="mt-1.5 text-sm text-ink/60">AI-Powered Clinical Decision Support</p>
      </div>

      <PulseDivider className="my-6 opacity-45" />

      {/* Role Tabs */}
      <div className="flex gap-1 rounded-xl border border-ink/10 bg-paper p-1 mb-6">
        <button
          type="button"
          onClick={() => { setRole("doctor"); setStep("phone"); }}
          className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2 px-1 text-xs font-semibold transition-colors ${
            role === "doctor" ? "bg-white text-teal-700 shadow-sm" : "text-ink/60 hover:bg-white/50 hover:text-ink"
          }`}
        >
          <Stethoscope className="h-4 w-4" />
          Doctor
        </button>
        <button
          type="button"
          onClick={() => { setRole("nurse"); setStep("phone"); }}
          className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2 px-1 text-xs font-semibold transition-colors ${
            role === "nurse" ? "bg-white text-teal-700 shadow-sm" : "text-ink/60 hover:bg-white/50 hover:text-ink"
          }`}
        >
          <Syringe className="h-4 w-4" />
          Nurse/ANM
        </button>
        <button
          type="button"
          onClick={() => { setRole("admin"); setStep("phone"); }}
          className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2 px-1 text-xs font-semibold transition-colors ${
            role === "admin" ? "bg-white text-teal-700 shadow-sm" : "text-ink/60 hover:bg-white/50 hover:text-ink"
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          Admin
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-tier-red-bg border border-tier-red/30 p-3 text-xs font-semibold text-tier-red">{error}</div>}

      {role === "doctor" && (
        <form onSubmit={handleStaffLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Email / Medical Council ID</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40"><Mail className="h-4 w-4" /></span>
              <input type="email" defaultValue="priya.sharma@anvaya.in" className="w-full rounded-lg border border-ink/20 bg-paper py-2.5 pl-10 pr-4 text-sm text-ink focus:border-teal-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} defaultValue="doctor123" className="w-full rounded-lg border border-ink/20 bg-paper py-2.5 pl-4 pr-10 text-sm text-ink focus:border-teal-500 focus:outline-none" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink/40 hover:text-ink/60">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 py-3 text-sm font-bold text-white shadow-md hover:bg-teal-600 disabled:opacity-70">
            {loading ? "Signing In..." : "Sign In to Hospital Panel"}
          </button>
        </form>
      )}

      {role === "admin" && (
        <form onSubmit={handleStaffLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Admin Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40"><Mail className="h-4 w-4" /></span>
              <input type="email" defaultValue="admin@rampur.health.in" className="w-full rounded-lg border border-ink/20 bg-paper py-2.5 pl-10 pr-4 text-sm text-ink focus:border-teal-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} defaultValue="admin123" className="w-full rounded-lg border border-ink/20 bg-paper py-2.5 pl-4 pr-10 text-sm text-ink focus:border-teal-500 focus:outline-none" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 py-3 text-sm font-bold text-white shadow-md hover:bg-teal-600 disabled:opacity-70">
            {loading ? "Signing In..." : "Sign In as Admin"}
          </button>
        </form>
      )}

      {role === "nurse" && (
        <div>
          {step === "phone" ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40"><Smartphone className="h-4 w-4" /></span>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="+91 98765 43210" className="w-full rounded-lg border border-ink/20 bg-paper py-2.5 pl-10 pr-4 text-sm text-ink focus:border-teal-500 focus:outline-none" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 py-3 text-sm font-bold text-white shadow-md hover:bg-teal-600 disabled:opacity-70">
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <p className="text-center text-xs text-ink/60">Enter the 6-digit OTP sent to your phone</p>
              <div className="flex justify-center gap-2">
                {nurseOtp.map((d, i) => (
                  <input key={i} type="text" maxLength={1} className="h-10 w-10 rounded border border-ink/20 bg-paper text-center text-lg font-bold text-teal-700 focus:border-teal-500 focus:outline-none"
                    value={d}
                    onChange={(e) => {
                      const newOtp = [...nurseOtp];
                      newOtp[i] = e.target.value.slice(-1);
                      setNurseOtp(newOtp);
                    }}
                  />
                ))}
              </div>
              <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 py-3 text-sm font-bold text-white shadow-md hover:bg-teal-600 disabled:opacity-70">
                {loading ? "Verifying..." : "Verify & Sign In"}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-md px-5 py-12">
      {/* Top Toggle */}
      <div className="mb-6 flex rounded-xl border border-ink/10 bg-paper p-1 shadow-sm">
        <button
          onClick={() => { setLoginType("patient"); setStep("phone"); setError(""); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
            loginType === "patient" ? "bg-white text-teal-700 shadow" : "text-ink/50 hover:bg-white/50"
          }`}
        >
          <User className="h-4 w-4" /> Patient
        </button>
        <button
          onClick={() => { setLoginType("staff"); setStep("phone"); setError(""); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${
            loginType === "staff" ? "bg-white text-teal-700 shadow" : "text-ink/50 hover:bg-white/50"
          }`}
        >
          <Activity className="h-4 w-4" /> Hospital Staff
        </button>
      </div>

      <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-md md:p-8">
        {loginType === "patient" ? renderPatientLogin() : renderStaffLogin()}
      </div>

      {loginType === "staff" && (
        <div className="mt-6 grid grid-cols-2 gap-2 text-center md:grid-cols-3">
          <button onClick={() => demoLogin("doctor")} className="rounded border border-ink/10 bg-white p-2 text-[10px] text-teal-600 shadow-sm hover:border-teal-300 font-bold flex flex-col items-center">
            <Stethoscope className="w-4 h-4 mb-1"/> Doctor Demo
          </button>
          <button onClick={() => demoLogin("nurse")} className="rounded border border-ink/10 bg-white p-2 text-[10px] text-teal-600 shadow-sm hover:border-teal-300 font-bold flex flex-col items-center">
            <Syringe className="w-4 h-4 mb-1"/> Nurse Demo
          </button>
          <button onClick={() => demoLogin("admin")} className="rounded border border-ink/10 bg-white p-2 text-[10px] text-teal-600 shadow-sm hover:border-teal-300 font-bold flex flex-col items-center col-span-2 md:col-span-1">
            <BarChart2 className="w-4 h-4 mb-1"/> Admin Demo
          </button>
        </div>
      )}
    </div>
  );
}
