import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-[#f5f7ff] p-3 text-[#08122f] sm:p-5 lg:p-8">
      <div className="relative mx-auto flex min-h-[calc(100vh-24px)] max-w-[1500px] flex-col overflow-hidden rounded-[32px] border border-white/80 bg-white/58 shadow-[0_34px_120px_-72px_rgba(48,66,132,0.7)] backdrop-blur-2xl sm:min-h-[calc(100vh-40px)] lg:min-h-[calc(100vh-64px)] lg:rounded-[36px]">
        <div className="pointer-events-none absolute -right-44 top-32 h-[720px] w-[720px] rounded-full border border-[#cbd6ff]/60 bg-[radial-gradient(circle_at_34%_28%,rgba(255,255,255,0.96),rgba(225,230,255,0.44)_42%,rgba(255,255,255,0.06)_72%)] shadow-[inset_0_0_48px_rgba(255,255,255,0.95),0_36px_120px_rgba(91,105,230,0.16)]" />
        <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-9 lg:px-11 lg:py-8">
          <Link href="/" className="text-3xl font-extrabold tracking-[-0.045em] text-[#061231] sm:text-[34px]">
            LLMEO
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#dfe5f2] bg-white/62 px-7 text-sm font-semibold text-[#08122f] shadow-[0_16px_44px_-34px_rgba(36,52,105,0.6)] backdrop-blur-xl transition hover:bg-white/86"
          >
            Sign in
          </Link>
        </header>
        <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-14">{children}</div>
      </div>
    </main>
  );
}
