import { useState } from "react";
import { ShieldCheck, Info, X } from "lucide-react";

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStorage?: boolean;
  initialSms?: boolean;
  initialAbdm?: boolean;
  onSave: (consent: { storage: boolean; sms: boolean; abdm: boolean }) => void;
}

export default function ConsentModal({
  isOpen,
  onClose,
  initialStorage = true,
  initialSms = true,
  initialAbdm = false,
  onSave,
}: ConsentModalProps) {
  const [storage, setStorage] = useState(initialStorage);
  const [sms, setSms] = useState(initialSms);
  const [abdm, setAbdm] = useState(initialAbdm);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ storage, sms, abdm });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/65 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-ink/10 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-ink/40 hover:bg-paper hover:text-ink/60 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 pb-3 border-b border-ink/10">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-teal-700">Consent & Privacy Agreement</h3>
            <p className="text-[10px] text-ink/40 uppercase font-bold tracking-wider">DPDP Act 2023 Compliance</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-3.5">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-ink/20 text-teal-600 focus:ring-teal-500"
                checked={storage}
                onChange={(e) => setStorage(e.target.checked)}
              />
              <div className="leading-tight">
                <span className="text-sm font-semibold text-ink">Local Diagnostic Storage</span>
                <p className="text-xs text-ink/50 mt-0.5">
                  Allows storing vitals, voice transcripts, and scans locally in your device cache.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-ink/20 text-teal-600 focus:ring-teal-500"
                checked={sms}
                onChange={(e) => setSms(e.target.checked)}
              />
              <div className="leading-tight">
                <span className="text-sm font-semibold text-ink">WhatsApp & SMS Reminders</span>
                <p className="text-xs text-ink/50 mt-0.5">
                  Allows scheduling follow-ups and receiving e-prescription files directly on mobile.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-ink/20 text-teal-600 focus:ring-teal-500"
                checked={abdm}
                onChange={(e) => setAbdm(e.target.checked)}
              />
              <div className="leading-tight">
                <span className="text-sm font-semibold text-ink">ABDM Digital Sync</span>
                <p className="text-xs text-ink/50 mt-0.5">
                  Sync diagnostics and visits with India's Ayushman Bharat Health Information Exchange.
                </p>
              </div>
            </label>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg bg-teal-50/40 p-3 text-[11px] text-teal-700 leading-normal border border-teal-500/10">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              You can modify, download, or completely revoke your stored health records and consent values at any time inside the Profile settings screen.
            </p>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-touch rounded-lg border border-ink/20 bg-paper text-sm font-semibold text-ink/70 hover:bg-ink/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 min-h-touch rounded-lg bg-teal-500 text-sm font-semibold text-white hover:bg-teal-600 transition-colors shadow shadow-teal-500/10"
            >
              Confirm Consent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
