"use client";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";
import { useRouter } from "next/navigation";
import { startPageTransition } from "@/components/page-transition-loader";

export default function ResetPasswordPage(){
 const [password,setPassword]=useState("");const [confirmation,setConfirmation]=useState("");const [error,setError]=useState("");const [done,setDone]=useState(false);const [busy,setBusy]=useState(false);const router=useRouter();
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setError("");if(password.length<8){setError("Use at least 8 characters.");return;}if(password!==confirmation){setError("Passwords do not match.");return;}if(!isSupabaseConfigured){setError("Supabase is not configured.");return;}setBusy(true);try{const {error:authError}=await createClient().auth.updateUser({password});if(authError)throw authError;setDone(true);setTimeout(()=>{startPageTransition("/login");router.replace("/login");},1500);}catch(reason){setError(reason instanceof Error?reason.message:"Password update failed.");}finally{setBusy(false);}}
 return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5"><div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50"><Logo/><h1 className="mt-8 text-2xl font-bold">Choose a new password</h1><form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-xs font-bold">New password<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label><label className="block text-xs font-bold">Confirm password<input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-200 px-3 text-sm"/></label>{error&&<p role="alert" className="text-xs text-red-600">{error}</p>}{done&&<p role="status" className="text-xs text-green-700">Password updated. Redirecting to sign in…</p>}<button aria-busy={busy} disabled={busy||!isSupabaseConfigured} className="h-12 w-full rounded-lg bg-blue-600 text-sm font-bold text-white disabled:opacity-50">{busy?"Updating…":"Update password"}</button></form><Link href="/login" className="mt-5 block text-center text-xs font-bold text-blue-600">Back to login</Link></div></main>;
}
