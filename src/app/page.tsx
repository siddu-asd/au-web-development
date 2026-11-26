import Link from "next/link";
import { ArrowRight, Blocks, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfcff]">
      <nav className="relative z-10 mx-auto flex h-20 max-w-7xl items-center justify-between border-b border-slate-100/80 px-6">
        <Logo />
        <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
          <a href="#features">Features</a><a href="#workflow">How it works</a><a href="#security">Security</a>
        </div>
        <Link href="/login" className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-blue-700">Sign in</Link>
      </nav>
      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.05fr_.95fr] md:pb-28 md:pt-24">
        <div aria-hidden="true" className="ambient-glow pointer-events-none absolute -right-36 -top-32 h-[32rem] w-[32rem] rounded-full bg-blue-200/40 blur-[110px]"/>
        <div className="dashboard-enter relative">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm backdrop-blur">
            <span className="relative grid h-2 w-2 place-items-center"><span className="absolute h-full w-full animate-ping rounded-full bg-blue-500/60"/><span className="relative h-1.5 w-1.5 rounded-full bg-blue-600"/></span> Academic project management
          </div>
          <h1 className="max-w-2xl text-5xl font-bold leading-[1.04] tracking-[-.055em] text-slate-950 md:text-7xl">
            From project idea to <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">approved submission.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-500 md:text-lg">
            Allocate unique projects, follow a clear development timeline, and review every submission in one connected academic workspace.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login" className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/20 transition hover:-translate-y-1 hover:shadow-blue-600/30">
              Open ProjectHub <ArrowRight size={17} />
            </Link>
            <Link href="/register" className="rounded-xl border border-slate-200 bg-white/80 px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white">Create account</Link>
          </div>
          <div className="mt-8 flex gap-6 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-green-600" /> Guided project timelines</span>
            <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-blue-600" /> Secure RLS</span>
          </div>
        </div>
        <div className="relative dashboard-enter [animation-delay:120ms]">
          <div className="ambient-glow absolute -inset-8 -z-10 rounded-full bg-gradient-to-br from-blue-100 via-indigo-50 to-violet-100 blur-3xl" />
          <div className="float-slow rounded-[1.75rem] border border-white bg-white/75 p-2.5 shadow-[0_40px_100px_-32px_rgba(15,23,42,.3)] backdrop-blur">
            <div className="overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#101827] to-[#172b51] p-5 sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3"><Blocks className="text-blue-400" size={22} /><span className="text-sm font-bold text-white">Project Overview</span></div>
                <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-[10px] font-bold text-green-400">ON TRACK</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[["68%","Progress"],["6","Days left"],["3","Submitted"]].map(([value,label]) => (
                  <div key={label} className="rounded-xl border border-white/[.09] bg-white/[.045] p-4 backdrop-blur">
                    <div className="text-xl font-bold text-white">{value}</div><div className="mt-1 text-[10px] text-slate-400">{label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-white/10 bg-white/[.04] p-4">
                <div className="mb-3 flex justify-between text-xs"><span className="font-bold text-white">Development checklist</span><span className="text-slate-400">17 / 25 tasks</span></div>
                {[72,58,88].map((w,i)=><div key={i} className="mb-2 flex h-8 items-center rounded-md bg-white/[.04] px-3"><div className="h-1.5 flex-1 rounded-full bg-white/10"><div className="h-full rounded-full bg-blue-500" style={{width:`${w}%`}} /></div></div>)}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="features" className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 md:grid-cols-3">
          {[["Exclusive allocation","Database-locked project selection"],["Daily progress","A configurable development checklist"],["Faculty review","Versioned submissions and feedback"]].map(([title,text]) => (
            <div key={title} className="product-card rounded-2xl border border-white bg-white p-6 shadow-sm"><span className="mb-5 grid h-10 w-10 place-items-center rounded-xl bg-blue-50"><Clock3 className="text-blue-600" size={20}/></span><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>
          ))}
        </div>
      </section>
    </main>
  );
}
