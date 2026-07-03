export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center">
      <h1 className="font-display text-3xl font-semibold text-teal-700">{title}</h1>
      <p className="mt-3 text-ink/60">This page is being built next.</p>
    </div>
  );
}
