import { useState } from "react";

interface GradCamOverlayProps {
  image: string;
  heatmap: string;
  className?: string;
  initialOpacity?: number;
}

export default function GradCamOverlay({
  image,
  heatmap,
  className = "",
  initialOpacity = 0.5,
}: GradCamOverlayProps) {
  const [opacity, setOpacity] = useState(initialOpacity);

  return (
    <div className={`rounded-xl border border-ink/10 bg-white p-4 shadow-sm ${className}`}>
      <h3 className="font-semibold text-ink text-sm mb-3">Visual Evidence & Heatmap</h3>

      {/* Stacked Images */}
      <div className="relative h-64 w-full overflow-hidden rounded bg-paper flex items-center justify-center border border-ink/5">
        <img
          src={image}
          alt="Original condition scan"
          className="absolute inset-0 h-full w-full object-contain"
        />
        <img
          src={heatmap}
          alt="AI attention heatmap"
          className="absolute inset-0 h-full w-full object-contain mix-blend-multiply pointer-events-none transition-opacity duration-75"
          style={{ opacity }}
        />
      </div>

      {/* Slider Control */}
      <div className="mt-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-ink/60">
          <span>Original image</span>
          <span>Grad-CAM Heatmap ({Math.round(opacity * 100)}%)</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          className="h-1.5 w-full cursor-pointer rounded-lg bg-teal-50 accent-teal-500"
          value={opacity}
          onChange={(e) => setOpacity(parseFloat(e.target.value))}
        />
        <p className="text-[10px] text-ink/40 leading-normal mt-2">
          *Grad-CAM (Gradient-weighted Class Activation Mapping) highlights local pixel regions driving the model's triage score.
        </p>
      </div>
    </div>
  );
}
