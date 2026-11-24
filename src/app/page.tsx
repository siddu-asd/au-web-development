import Link from "next/link";
import { ArrowRight, Blocks, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Logo />
        <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
          <a href="#features">Features</a><a href="#workflow">How it works</a><a href="#security">Security</a>
        </div>
        <Link href="/login" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20">Sign in</Link>
      </nav>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.05fr_.95fr] md:pt-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" /> Academic project management
          </div>
          <h1 className="max-w-xl text-5xl font-bold leading-[1.08] tracking-tight text-slate-950 md:text-6xl">
            From project idea to <span className="text-blue-600">approved submission.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-500">
            Allocate unique projects, guide 10-day development, and review every submission in one connected academic workspace.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/login" className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/20">
              Open ProjectHub <ArrowRight size={17} />
            </Link>
            <Link href="/register" className="rounded-lg border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-700">Create account</Link>
          </div>
          <div className="mt-8 flex gap-6 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-2"><CheckCircle2 size={15} className="text-green-600" /> 10-day tracking</span>
            <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-blue-600" /> Secure RLS</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-8 -z-10 rounded-full bg-blue-50 blur-3xl" />
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_30px_80px_-20px_rgba(15,23,42,.22)]">
            <div className="rounded-xl bg-slate-950 p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3"><Blocks className="text-blue-400" size={22} /><span className="text-sm font-bold text-white">Project Overview</span></div>
                <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-[10px] font-bold text-green-400">ON TRACK</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[["68%","Progress"],["6","Days left"],["3","Submitted"]].map(([value,label]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-white/[.04] p-4">
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
          {[["Exclusive allocation","Database-locked project selection"],["Daily progress","A clear 10-day development checklist"],["Faculty review","Versioned submissions and feedback"]].map(([title,text]) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-6"><Clock3 className="mb-4 text-blue-600" size={21}/><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm text-slate-500">{text}</p></div>
          ))}
        </div>
      </section>
    </main>
  );
}
