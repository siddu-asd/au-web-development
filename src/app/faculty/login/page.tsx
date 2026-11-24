"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UsersRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";
import { useRouter } from "next/navigation";

export default function FacultyLoginPage() {
  const [method,setMethod]=useState<"password"|"otp">("password");
  const [showPassword,setShowPassword]=useState(false);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const router=useRouter();

  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if(!isSupabaseConfigured) {
        setError("Faculty sign-in requires a configured Supabase project.");
        return;
      }

      const supabase=createClient();
      if(method==="otp") {
        const {error:authError}=await supabase.auth.signInWithOtp({
          email,
          options:{shouldCreateUser:false},
        });
        if(authError)throw authError;
        router.push(`/verify-otp?email=${encodeURIComponent(email)}&type=email&audience=faculty`);
        return;
      }

      const {error:authError}=await supabase.auth.signInWithPassword({email,password});
      if(authError)throw authError;
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error("Unable to load your authenticated profile.");
      const {data:profile,error:profileError}=await supabase
        .from("profiles")
        .select("role,account_status")
        .eq("id",user.id)
        .single();
      if(profileError)throw profileError;
      if(profile.role!=="FACULTY") {
        await supabase.auth.signOut();
        throw new Error("This sign-in page is for faculty accounts. Use the student sign-in page for student accounts.");
      }
      if(profile.account_status!=="ACTIVE") {
        await supabase.auth.signOut();
        throw new Error("Your faculty account is not active. Contact your administrator.");
      }
      router.replace("/faculty/dashboard");
      router.refresh();
    } catch(reason) {
      setError(reason instanceof Error?reason.message:"Faculty sign-in failed. Please try again.");
    } finally {setBusy(false);}
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_480px]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-32 top-20 h-96 w-96 rounded-full bg-indigo-600/25 blur-3xl" />
        <div><Logo /></div>
        <div className="relative my-auto max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">
            <UsersRound size={15}/> Faculty workspace
          </div>
          <h1 className="text-5xl font-bold leading-[1.1]">Guide projects.<br/><span className="text-indigo-300">Track progress.</span></h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-slate-400">
            Review student submissions, monitor progress, and guide project work from your faculty dashboard.
          </p>
        </div>
        <div className="text-xs text-slate-500">© 2026 Arunodaya University</div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[390px]">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Faculty portal</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Faculty sign in</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Access your student tracking and project review workspace.</p>

          <div className="mt-7 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button type="button" onClick={()=>setMethod("password")} className={`rounded-md py-2 text-xs font-bold ${method==="password"?"bg-white text-slate-950 shadow-sm":"text-slate-500"}`}>Email & password</button>
            <button type="button" onClick={()=>setMethod("otp")} className={`rounded-md py-2 text-xs font-bold ${method==="otp"?"bg-white text-slate-950 shadow-sm":"text-slate-500"}`}>Email OTP</button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-700">Faculty email address</span>
              <span className="relative block"><Mail className="absolute left-3.5 top-3.5 text-slate-400" size={17}/><input required type="email" autoComplete="email" placeholder="you@university.edu" value={email} onChange={event=>setEmail(event.target.value)} className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"/></span>
            </label>
            {method==="password"?(
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-700">Password</span>
                <span className="relative block"><LockKeyhole className="absolute left-3.5 top-3.5 text-slate-400" size={17}/><input required autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} type={showPassword?"text":"password"} className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-11 text-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-slate-400">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span>
              </label>
            ):(
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs leading-5 text-indigo-700">A six-digit sign-in code will be sent to your registered faculty email.</div>
            )}
            {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}
            <button disabled={busy} type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60">
              {busy?"Please wait…":method==="otp"?"Send faculty sign-in code":"Sign in to faculty portal"} <ArrowRight size={16}/>
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Faculty accounts are created by an administrator.<br/>
            Student? <Link href="/login" className="font-bold text-indigo-600">Go to student sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
