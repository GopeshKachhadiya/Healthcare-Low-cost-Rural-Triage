export default function PulseDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`pulse-divider ${className}`}
      viewBox="0 0 400 32"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0 16 H140 L155 16 L165 4 L178 28 L188 16 H400" />
    </svg>
  );
}
