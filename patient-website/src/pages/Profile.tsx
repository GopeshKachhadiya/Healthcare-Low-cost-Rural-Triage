import { useState } from "react";
import { Link } from "react-router-dom";
import { User, Globe, Shield, Save, LogOut, CheckCircle2, ArrowLeft } from "lucide-react";
import PulseDivider from "../components/PulseDivider";
import { useSession } from "../hooks/useSession";

const LANGUAGES = [
  { code: "hi", label: "हिन्दी", sub: "Hindi" },
  { code: "ta", label: "தமிழ்", sub: "Tamil" },
  { code: "te", label: "తెలుగు", sub: "Telugu" },
  { code: "kn", label: "ಕನ್ನಡ", sub: "Kannada" },
  { code: "bn", label: "বাংলা", sub: "Bengali" },
  { code: "mr", label: "मराठी", sub: "Marathi" },
  { code: "en", label: "English", sub: "English" },
];

export default function Profile() {
  const { user, consent, updateProfile, updateConsent, logout } = useSession();

  const [name, setName] = useState(user?.name || "");
  const [dob, setDob] = useState(user?.dob || "");
  const [gender, setGender] = useState(user?.gender || "Male");
  const [village, setVillage] = useState(user?.village || "");
  const [abhaId, setAbhaId] = useState(user?.abhaId || "");
  const [lang, setLang] = useState(user?.preferredLanguage || "hi");

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      dob,
      gender,
      village,
      abhaId,
      preferredLanguage: lang,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-teal-700">Not Logged In</h1>
        <p className="mt-2 text-ink/60">Please login to view and edit your health profile.</p>
        <Link
          to="/login"
          className="mt-6 inline-flex min-h-touch items-center justify-center px-6 rounded-lg bg-teal-500 font-semibold text-white shadow-md shadow-teal-500/10 hover:bg-teal-600 transition-colors"
        >
          Login Now
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/home"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink hover:border-teal-400 hover:text-teal-600 transition-all shadow-sm shrink-0"
            aria-label="Back to Home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold text-teal-700">My Profile & Settings</h1>
            <p className="text-sm text-ink/60">Manage your health identity, language, and consent records</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex min-h-touch items-center justify-center gap-1.5 rounded-lg border border-tier-red/20 bg-tier-red-bg px-4 text-sm font-semibold text-tier-red hover:bg-tier-red hover:text-white transition-colors shrink-0"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>


      <PulseDivider className="my-6 opacity-30" />

      {saved && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-tier-green-bg p-4 text-tier-green font-medium">
          <CheckCircle2 className="h-5 w-5" />
          Profile updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left column: Profile details */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-teal-700 mb-4">
              <User className="h-5 w-5" />
              Personal Details
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-ink/60 uppercase">Full Name</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink focus:border-teal-500 focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/60 uppercase">Phone Number</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-ink/10 bg-paper px-3 py-2 text-ink/50 focus:outline-none"
                  value={user.phone}
                  disabled
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/60 uppercase">Date of Birth</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink focus:border-teal-500 focus:outline-none"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/60 uppercase">Gender</label>
                <select
                  className="mt-1 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink focus:border-teal-500 focus:outline-none"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/60 uppercase">Village / Block</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink focus:border-teal-500 focus:outline-none"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/60 uppercase">ABHA ID (Optional)</label>
                <input
                  type="text"
                  placeholder="14-XXXX-XXXX-XXXX"
                  className="mt-1 w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink focus:border-teal-500 focus:outline-none"
                  value={abhaId}
                  onChange={(e) => setAbhaId(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Language preference selection */}
          <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-teal-700 mb-2">
              <Globe className="h-5 w-5" />
              Language Preference / भाषा प्राथमिकता
            </h2>
            <p className="text-xs text-ink/50 mb-4">Choose your preferred language for all diagnostic readouts and chatbot advice.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                    lang === l.code
                      ? "border-teal-500 bg-teal-50 text-teal-700 font-semibold"
                      : "border-ink/10 bg-paper hover:border-teal-300 text-ink/70"
                  }`}
                >
                  <span className="text-base">{l.label}</span>
                  <span className="text-xs opacity-60 font-normal">{l.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Consent and Safety */}
        <div className="space-y-6">
          <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-teal-700 mb-2">
              <Shield className="h-5 w-5" />
              Consent & Privacy
            </h2>
            <p className="text-xs text-ink/50 mb-4">Logged directly to consent audit tables, aligned with DPDP Act 2023.</p>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-ink/20 text-teal-600 focus:ring-teal-500"
                  checked={consent.storage}
                  onChange={(e) => updateConsent({ storage: e.target.checked })}
                />
                <div className="leading-tight">
                  <span className="text-sm font-semibold text-ink">Local Diagnostic Storage</span>
                  <p className="text-xs text-ink/50 mt-0.5">Allows storing vital logs, voice snippets, and scans in offline IndexedDB.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-ink/20 text-teal-600 focus:ring-teal-500"
                  checked={consent.sms}
                  onChange={(e) => updateConsent({ sms: e.target.checked })}
                />
                <div className="leading-tight">
                  <span className="text-sm font-semibold text-ink">SMS/WhatsApp Follow-ups</span>
                  <p className="text-xs text-ink/50 mt-0.5">Allows on-call notifications and automatic check-ins from n8n orchestrators.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-ink/20 text-teal-600 focus:ring-teal-500"
                  checked={consent.abdm}
                  onChange={(e) => updateConsent({ abdm: e.target.checked })}
                />
                <div className="leading-tight">
                  <span className="text-sm font-semibold text-ink">ABDM Digital Sync</span>
                  <p className="text-xs text-ink/50 mt-0.5">Sync medical records with India's Ayushman Bharat Health Exchange.</p>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full min-h-touch items-center justify-center gap-2 rounded-lg bg-teal-500 font-semibold text-white shadow-md shadow-teal-500/10 hover:bg-teal-600 transition-colors"
          >
            <Save className="h-5 w-5" />
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}
