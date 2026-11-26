"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, GraduationCap, Hash, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";
import { useRouter } from "next/navigation";
import { startPageTransition } from "@/components/page-transition-loader";

const inputClassName =
  "h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100";

export default function RegisterPage() {
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [registrationNumber,setRegistrationNumber]=useState("");
  const [password,setPassword]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const router=useRouter();

  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if(password.length<8){setError("Use a password with at least 8 characters.");return;}
    if(password!==confirmation){setError("Passwords do not match.");return;}
    if(!isSupabaseConfigured){setError("Registration requires Supabase configuration. Add your project URL and anon key to .env.local.");return;}
    setBusy(true);
    try {
      const supabase=createClient();
      const {data,error:authError}=await supabase.auth.signUp({
        email,
        password,
        options:{data:{full_name:name,registration_number:registrationNumber,role:"STUDENT"}},
      });
      if(authError)throw authError;
      if(data.session) {
        startPageTransition("/student/dashboard");
        router.replace("/student/dashboard");
        router.refresh();
        return;
      }
      const destination = `/login?email=${encodeURIComponent(email)}&signup=created`;
      startPageTransition(destination);
      router.replace(destination);
    } catch(reason) {
      setError(reason instanceof Error?reason.message:"Registration failed. Please try again.");
    } finally {setBusy(false);}
  }

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(500px,0.9fr)]">
      <section className="auth-visual-panel dashboard-enter relative hidden min-h-screen overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col xl:p-16">
        <div aria-hidden="true" className="auth-visual-orbit"/>
        <div className="relative"><Logo tone="inverse"/></div>
        <div className="relative my-auto max-w-xl py-16">
          <div className="auth-panel-kicker mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-semibold text-blue-300">
            <span/><GraduationCap size={15} /> ProjectHub student workspace
          </div>
          <h1 className="text-5xl font-bold leading-[1.12] tracking-tight xl:text-6xl">
            Your next big idea<br />starts <span className="text-blue-400">right here.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
            Create your student account to explore projects, track your progress, and share your final work.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-slate-300">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">01</span>
            <span>One account for your complete project journey</span>
          </div>
        </div>
        <div className="relative flex items-center justify-between gap-4"><p className="text-xs text-slate-500">© 2026 Arunodaya University</p><span className="auth-side-note"><span className="auth-live-dot"/> YOUR FIRST BUILD STARTS HERE</span></div>
      </section>

      <section className="dashboard-enter flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 [animation-delay:80ms]">
        <div className="w-full max-w-[480px]">
          <div className="mb-7 lg:hidden"><Logo /></div>
          <div className="product-card rounded-3xl border border-white bg-white/90 p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,.35)] backdrop-blur sm:p-9">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Get started</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Create your account</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Register as a student to start managing your projects.
              </p>
            </div>

            {!isSupabaseConfigured&&<p role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Supabase configuration is required to register an account.</p>}

            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-700">Full name</span>
                <span className="relative block"><UserRound className="absolute left-3.5 top-3.5 text-slate-400" size={17}/><input required autoComplete="name" placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)} className={inputClassName}/></span>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-700">Email address</span>
                <span className="relative block"><Mail className="absolute left-3.5 top-3.5 text-slate-400" size={17}/><input required type="email" autoComplete="email" placeholder="you@university.edu" value={email} onChange={e=>setEmail(e.target.value)} className={inputClassName}/></span>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-700">Student ID</span>
                <span className="relative block"><Hash className="absolute left-3.5 top-3.5 text-slate-400" size={17}/><input required autoComplete="off" placeholder="Enter your student ID" value={registrationNumber} onChange={e=>setRegistrationNumber(e.target.value)} className={inputClassName}/></span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-700">Password</span>
                  <span className="relative block"><LockKeyhole className="absolute left-3.5 top-3.5 text-slate-400" size={17}/><input required minLength={8} type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={e=>setPassword(e.target.value)} className={inputClassName}/></span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-700">Confirm password</span>
                  <span className="relative block"><LockKeyhole className="absolute left-3.5 top-3.5 text-slate-400" size={17}/><input required minLength={8} type="password" autoComplete="new-password" placeholder="Re-enter password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} className={inputClassName}/></span>
                </label>
              </div>

              <p className="text-xs leading-5 text-slate-500">Your password is securely managed by Supabase. After creating your account, you can sign in with your password or choose email OTP—either method is enough.</p>
              {error&&<p role="alert" className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}
              <button aria-busy={busy} disabled={busy||!isSupabaseConfigured} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                {busy?"Creating account…":"Create student account"} <ArrowRight size={16}/>
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Faculty accounts require administrator approval.<br />
              Already registered? <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700">Sign in</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
