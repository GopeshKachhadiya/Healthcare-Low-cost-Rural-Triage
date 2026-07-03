export default function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-teal-700 text-teal-50">
      {/* Non-dismissible safety disclaimer, per patient.md §3.4 — rendered
          prominently, not buried in fine print. */}
      <div className="mx-auto max-w-5xl px-5 py-3 text-center text-xs leading-relaxed text-teal-100">
        This is an AI screening aid, not a medical diagnosis. Please consult a
        qualified healthcare professional for confirmation and treatment.
      </div>
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-5 pb-6 pt-2 text-xs text-teal-200 sm:flex-row">
        <p>© 2026 ArogyaMitra — AI Triage Companion</p>
        <p>Works offline · Available in Hindi, Tamil, English</p>
      </div>
    </footer>
  );
}
