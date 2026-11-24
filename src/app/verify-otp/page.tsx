"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

export default function VerifyOtpPage() {
  const [token,setToken]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [resending,setResending]=useState(false);
  const router=useRouter();

  function getRequestDetails() {
    const query=new URLSearchParams(window.location.search);
    return {
      email:query.get("email"),
      type:query.get("type")==="signup"?"signup" as const:"email" as const,
      audience:query.get("audience")==="faculty"?"faculty" as const:"student" as const,
    };
  }

  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const {email,type,audience}=getRequestDetails();
    if(!email){setError("Email address is missing. Return to the previous page and try again.");return;}
    if(!isSupabaseConfigured){setError("Supabase is not configured.");return;}
    setBusy(true);
    try {
      const supabase=createClient();
      const {error:authError}=await supabase.auth.verifyOtp({email,token,type});
      if(authError)throw authError;
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)throw new Error("Email verified, but a user session could not be created.");
      const {data:profile,error:profileError}=await supabase.from("profiles").select("role,account_status").eq("id",user.id).single();
      if(profileError)throw profileError;
      if(profile.account_status!=="ACTIVE")throw new Error("Your account is not active. Contact your administrator.");
      if((audience==="faculty" && profile.role!=="FACULTY") || (audience==="student" && profile.role==="FACULTY")) {
        await supabase.auth.signOut();
        throw new Error(audience==="faculty"
          ? "This sign-in page is for faculty accounts. Use the student sign-in page for student accounts."
          : "This sign-in page is for students. Use the faculty sign-in page for faculty accounts.");
      }
      const destination=profile.role==="SUPER_ADMIN"?"/admin/dashboard":profile.role==="FACULTY"?"/faculty/dashboard":"/student/dashboard";
      router.replace(destination);
      router.refresh();
    } catch(reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : reason && typeof reason === "object" && "message" in reason && typeof reason.message === "string"
            ? reason.message
            : "";
      setError(message || "Code verification failed. Request a new code and try again.");
    } finally {setBusy(false);}
  }

  async function resendCode() {
    setError("");
    setNotice("");
    const {email,type}=getRequestDetails();
    if(!email){setError("Email address is missing. Return to the previous page and try again.");return;}
    if(!isSupabaseConfigured){setError("Supabase is not configured.");return;}
    setResending(true);
    try {
      const supabase=createClient();
      const result=type==="signup"
        ? await supabase.auth.resend({type:"signup",email})
        : await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:false}});
      if(result.error)throw result.error;
      setToken("");
      setNotice("A new verification code has been sent. Check your email.");
    } catch(reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : reason && typeof reason === "object" && "message" in reason && typeof reason.message === "string"
            ? reason.message
            : "";
      setError(message || "Could not resend the code. Please try again.");
    } finally {setResending(false);}
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/50">
        <div className="mx-auto w-fit"><Logo /></div>
        <h1 className="mt-8 text-2xl font-bold">Verify your email</h1>
        <p className="mt-2 text-sm text-slate-500">Enter the six-digit code sent to your email.</p>
        <form onSubmit={submit} className="mt-7"><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} minLength={6} required value={token} onChange={e=>setToken(e.target.value)} placeholder="000000" className="h-14 w-full rounded-lg border border-slate-200 text-center text-2xl font-bold tracking-[0.5em]" />{error&&<p role="alert" className="mt-3 text-left text-xs text-red-600">{error}</p>}<button disabled={busy} className="mt-4 h-12 w-full rounded-lg bg-blue-600 text-sm font-bold text-white disabled:opacity-50">{busy?"Verifying…":"Verify account"}</button></form>
        {notice&&<p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-left text-xs text-green-700">{notice}</p>}
        <button type="button" onClick={resendCode} disabled={busy||resending} className="mt-5 text-xs font-bold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          {resending?"Sending a new code…":"Resend code"}
        </button>
        <Link href="/login" className="mt-5 inline-block text-xs font-bold text-blue-600">Back to login</Link>
      </div>
    </main>
  );
}
