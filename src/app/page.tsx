import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

const valueProps = [
  "Audit how your business appears in AI-generated answers.",
  "Track prompts, competitors, citations, and recommendations.",
  "Built around Australian locations, services, and buying intent.",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef5f4_100%)]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm">
            <Sparkles className="size-4" />
            AUS LLMEO
          </div>

          <div className="space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
              AI visibility software for Australian businesses.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Understand where your brand appears, where competitors are winning, and which content changes will improve your visibility in AI answers.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/audit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800"
            >
              Free AI visibility audit
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Sign in
            </Link>
          </div>

          <div className="grid gap-3 pt-4 md:grid-cols-3">
            {valueProps.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm leading-6 text-slate-600 shadow-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
