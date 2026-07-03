import { Globe, Check } from "lucide-react";
import { useState } from "react";

const LANGUAGES = [
  { code: "hi", label: "हिन्दी", sub: "Hindi" },
  { code: "ta", label: "தமிழ்", sub: "Tamil" },
  { code: "te", label: "తెలుగు", sub: "Telugu" },
  { code: "kn", label: "ಕನ್ನಡ", sub: "Kannada" },
  { code: "bn", label: "বাংলা", sub: "Bengali" },
  { code: "mr", label: "मराठी", sub: "Marathi" },
  { code: "en", label: "English", sub: "English" },
];

interface LanguageSelectorProps {
  currentLanguage: string;
  onChangeLanguage: (code: string) => void;
  className?: string;
}

export default function LanguageSelector({
  currentLanguage,
  onChangeLanguage,
  className = "",
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentLangObj = LANGUAGES.find((l) => l.code === currentLanguage) || LANGUAGES[0];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-touch items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink/70 hover:bg-paper hover:text-teal-600 transition-colors focus:outline-none"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <Globe className="h-5 w-5" />
        <span>{currentLangObj.label}</span>
      </button>

      {isOpen && (
        <>
          {/* Overlay to click off dropdown */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 z-50 w-44 rounded-xl border border-ink/10 bg-white py-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
            <span className="block px-4 py-1 text-[10px] font-bold text-ink/40 uppercase tracking-wider">
              Choose Language / भाषा चुनें
            </span>
            <div className="mt-1 divide-y divide-ink/5 max-h-60 overflow-y-auto">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    onChangeLanguage(l.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs transition-colors hover:bg-paper ${
                    currentLanguage === l.code
                      ? "text-teal-700 font-semibold bg-teal-50/50"
                      : "text-ink/70"
                  }`}
                >
                  <div className="leading-tight">
                    <p className="font-semibold">{l.label}</p>
                    <p className="text-[10px] text-ink/40 mt-0.5">{l.sub}</p>
                  </div>
                  {currentLanguage === l.code && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
