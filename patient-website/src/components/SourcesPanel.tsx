import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface Source {
  title: string;
  content: string;
}

interface SourcesPanelProps {
  sources: Source[];
  className?: string;
  initiallyExpanded?: boolean;
}

export default function SourcesPanel({
  sources,
  className = "",
  initiallyExpanded = false,
}: SourcesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  if (!sources || sources.length === 0) return null;

  return (
    <div className={`rounded-xl border border-ink/10 bg-teal-50/20 p-4 text-xs ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between font-semibold text-teal-700 focus:outline-none"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-1.5 font-display text-sm font-bold">
          <BookOpen className="h-4.5 w-4.5" />
          Clinical Guidelines Cited ({sources.length})
        </span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3 divide-y divide-teal-500/10 animate-in fade-in duration-200">
          {sources.map((s, idx) => (
            <div key={idx} className={`pt-2.5 ${idx === 0 ? "pt-0" : ""}`}>
              <span className="font-bold text-teal-800 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
                {s.title}
              </span>
              <p className="text-ink/65 mt-1 leading-normal pl-2.5 border-l border-teal-500/20">
                {s.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
