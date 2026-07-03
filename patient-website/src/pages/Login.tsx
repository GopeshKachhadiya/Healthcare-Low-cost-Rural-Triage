import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { Phone, ArrowRight, ShieldCheck, HelpCircle } from "lucide-react";
import PulseDivider from "../components/PulseDivider";

export default function Login() {
  const { login } = useSession();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setError("");
    setLoading(true);
    // Simulate sending OTP
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
    }, 800);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return;
    const newOtp = [...otp];
    newOtp[index] = val.substring(val.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
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
      login(`+91 ${phone}`);
      navigate("/");
    }, 1000);
  };

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-md md:p-8">
        <div className="text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-teal-500 font-display text-2xl text-white shadow-md shadow-teal-500/20">
            अ
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-teal-700">ArogyaMitra Login</h1>
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
          <form onSubmit={handleVerify} className="space-y-5">
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
                    pattern="\d*"
                    maxLength={1}
                    className="h-14 w-12 rounded-lg border border-ink/20 bg-paper text-center text-xl font-bold text-teal-700 focus:border-teal-500 focus:outline-none"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-xs font-semibold text-tier-red text-center">{error}</p>}

            <div className="text-center text-xs text-ink/50">
              Didn't receive code?{" "}
              <button
                type="button"
                className="text-teal-600 underline font-semibold hover:text-teal-700"
                onClick={() => {
                  setOtp(["", "", "", ""]);
                  setError("A new code has been sent (simulation).");
                }}
              >
                Resend Code
              </button>
            </div>

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
      </div>
    </div>
  );
}
