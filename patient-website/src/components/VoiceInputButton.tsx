import { Mic, MicOff } from "lucide-react";

interface VoiceInputButtonProps {
  isRecording: boolean;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export default function VoiceInputButton({
  isRecording,
  onClick,
  className = "",
  disabled = false,
}: VoiceInputButtonProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {isRecording && (
        <>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tier-red opacity-20" />
          <span className="absolute inline-flex h-[130%] w-[130%] animate-pulse rounded-full bg-tier-red opacity-10" />
        </>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed z-10 ${
          isRecording
            ? "bg-tier-red text-white shadow-lg shadow-tier-red/30"
            : "bg-teal-500 text-white shadow-lg shadow-teal-500/20 hover:bg-teal-600"
        }`}
        aria-label={isRecording ? "Stop voice recording" : "Start voice recording"}
      >
        {isRecording ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
      </button>
    </div>
  );
}
