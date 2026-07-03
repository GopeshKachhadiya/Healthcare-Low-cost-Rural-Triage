import { useState, useEffect } from "react";
import { WifiOff, AlertTriangle } from "lucide-react";

interface ConnectivityBannerProps {
  className?: string;
}

export default function ConnectivityBanner({ className = "" }: { className?: string }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className={`bg-tier-yellow-bg border-b border-tier-yellow/20 text-tier-yellow px-5 py-2.5 text-xs font-semibold flex items-center justify-between gap-4 animate-in slide-in-from-top duration-200 ${className}`}
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0 text-tier-yellow" />
        <span>
          <strong>Clinic Offline Mode:</strong> Vitals check & skin scanning are running on-device. Clinic appointments are queued locally.
        </span>
      </div>
      <div className="flex items-center gap-1 rounded bg-white/60 border border-tier-yellow/10 px-2 py-0.5 text-[9px] uppercase font-bold text-tier-yellow shrink-0">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        IndexedDB Active
      </div>
    </div>
  );
}
