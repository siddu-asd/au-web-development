"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

export default function ForgotPasswordPage() {
  const [email,setEmail]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setError("");setMessage("");
    if(!isSupabaseConfigured){setError("Supabase is not configured.");return;}
    setBusy(true);
    try {
      const {error:authError}=await createClient().auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`});
      if(authError)throw authError;
      setMessage("If an account exists for that email, a secure reset link has been sent.");
    } catch(reason) {setError(reason instanceof Error?reason.message:"Unable to send reset email.");}
    finally {setBusy(false);}
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <Logo/><h1 className="mt-8 text-2xl font-bold">Reset your password</h1><p className="mt-2 text-sm text-slate-500">We&apos;ll send a secure reset link to your verified email.</p>
        <form onSubmit={submit} className="mt-7"><label className="block text-xs font-bold text-slate-700">Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>{error&&<p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}{message&&<p role="status" className="mt-3 text-xs text-green-700">{message}</p>}<button aria-busy={busy} disabled={busy||!isSupabaseConfigured} className="mt-4 h-12 w-full rounded-lg bg-blue-600 text-sm font-bold text-white disabled:opacity-50">{busy?"Sending…":"Send reset link"}</button></form>
        <Link href="/login" className="mt-5 block text-center text-xs font-bold text-blue-600">Back to login</Link>
      </div>
    </main>
  );
}
