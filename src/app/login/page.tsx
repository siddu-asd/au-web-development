"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { Eye, EyeOff, Mail, LockKeyhole, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";
import { useRouter, useSearchParams } from "next/navigation";
import { startPageTransition } from "@/components/page-transition-loader";
import { AuthThreeScene } from "@/components/auth-three-scene";

function LoginForm() {
  const searchParams = useSearchParams();
  const signupCompleted = searchParams.get("signup") === "created";
  const [method, setMethod] = useState<"password"|"otp">("password");
  const [show, setShow] = useState(false);
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!isSupabaseConfigured) {
        const destination = role === "admin" ? "/admin/dashboard" : "/student/dashboard";
        startPageTransition(destination);
        router.push(destination);
        return;
      }

      const supabase = createClient();
      if (method === "otp") {
        const { error: authError } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
        if (authError) throw authError;
        const destination = `/verify-otp?email=${encodeURIComponent(email)}&type=email&audience=student`;
        startPageTransition(destination);
        router.push(destination);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unable to load your authenticated profile.");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, account_status")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;
      if (profile.account_status !== "ACTIVE") throw new Error("Your account is not active. Contact your administrator.");
      if (profile.role === "FACULTY") {
        await supabase.auth.signOut();
        throw new Error("This sign-in page is for students. Use the faculty sign-in page for faculty accounts.");
      }
      const destination = profile.role === "SUPER_ADMIN" ? "/admin/dashboard" : profile.role === "FACULTY" ? "/faculty/dashboard" : "/student/dashboard";
      startPageTransition(destination);
      router.replace(destination);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_480px]">
      <section className="auth-visual-panel dashboard-enter relative hidden overflow-hidden bg-slate-950 p-12 lg:flex lg:flex-col">
        <AuthThreeScene />
        <div aria-hidden="true" className="auth-visual-orbit"/>
        <div className="relative"><Logo tone="inverse"/></div>
        <div className="relative z-10 my-auto max-w-xl">
          <div className="auth-panel-kicker mb-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-400"><span/> ProjectHub workspace</div>
          <h1 className="text-5xl font-bold leading-[1.1] text-white">Build with purpose.<br/><span className="text-blue-400">Track every step.</span></h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-slate-400">One workspace for project allocation, daily development progress and final submission reviews.</p>
        </div>
        <div className="relative z-10 flex items-center justify-between gap-4"><p className="text-xs text-slate-500">© 2026 Arunodaya University</p><span className="auth-side-note"><span className="auth-live-dot"/> YOUR WORKSPACE IS READY</span></div>
      </section>
      <section className="dashboard-enter flex items-center justify-center px-6 py-12 [animation-delay:80ms]">
        <div className="w-full max-w-[390px]">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">Welcome back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue to your student workspace.</p>
          <div className="mt-7 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            <button onClick={()=>setMethod("password")} className={`rounded-md py-2 text-xs font-bold ${method==="password"?"bg-white text-slate-950 shadow-sm":"text-slate-500"}`}>Email & password</button>
            <button onClick={()=>setMethod("otp")} className={`rounded-md py-2 text-xs font-bold ${method==="otp"?"bg-white text-slate-950 shadow-sm":"text-slate-500"}`}>Gmail OTP</button>
          </div>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-slate-700">Email address</span>
              <div className="relative"><Mail className="absolute left-3.5 top-3.5 text-slate-400" size={17}/><input required type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/></div>
            </label>
            {method==="password" ? (
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-700">Password</span>
                <div className="relative"><LockKeyhole className="absolute left-3.5 top-3.5 text-slate-400" size={17}/><input required autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} type={show?"text":"password"} className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-11 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/><button type="button" onClick={()=>setShow(!show)} className="absolute right-3.5 top-3.5 text-slate-400">{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
              </label>
            ) : (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">A six-digit verification code will be sent to this email.</div>
            )}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-600"><input type="checkbox" defaultChecked className="accent-blue-600"/> Remember session</label>
              <Link href="/forgot-password" className="font-bold text-blue-600">Forgot password?</Link>
            </div>
            {!isSupabaseConfigured && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Demo mode: configure Supabase to enable real authentication. Demo portal
              <select aria-label="Demo portal" value={role} onChange={(e)=>setRole(e.target.value)} className="ml-2 rounded border border-amber-200 bg-white px-2 py-1"><option value="student">Student</option><option value="admin">Admin</option></select>
            </div>}
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            {signupCompleted && <p role="status" className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">Account created. Sign in with the email and password you just registered. If Supabase says the email is not confirmed, turn off <strong>Confirm email</strong> in Supabase Authentication settings; the app cannot bypass that setting.</p>}
            <button aria-busy={busy} disabled={busy} type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-60">
              {busy ? "Please wait…" : method==="otp"?"Send verification code":"Sign in"} <ArrowRight size={16}/>
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-500">New student? <Link href="/register" className="font-bold text-blue-600">Create an account</Link><br/>Faculty? <Link href="/faculty/login" className="font-bold text-blue-600">Faculty sign in</Link></p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Loading sign-in…</main>}><LoginForm/></Suspense>;
}
