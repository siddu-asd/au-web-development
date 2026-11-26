"use client";

import { Suspense, use, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { AlertTriangle, ArrowLeft, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";
import { startPageTransition } from "@/components/page-transition-loader";

function ProjectDetailsContent({params}:{params:Promise<{projectId:string}>}){
 const {projectId}=use(params);
 const [read,setRead]=useState(false); const [confirm,setConfirm]=useState(false);
 const [project,setProject]=useState<Record<string,unknown>|null>(null);
 const [projectDuration,setProjectDuration]=useState(10);
 const [loading,setLoading]=useState(isSupabaseConfigured);
 const [error,setError]=useState("");
 const [allocating,setAllocating]=useState(false);
 const router=useRouter();
 useEffect(()=>{
  if(!isSupabaseConfigured)return;
  let active=true;
  async function load(){
   try{
    const supabase=createClient();
    const [{data,error:projectError},{data:settings,error:settingsError}]=await Promise.all([
     supabase.from("projects").select("id,project_code,title,description,problem_statement,objectives,requirements,technologies,difficulty,subjects(subject_name)").eq("id",projectId).eq("status","PUBLISHED").single(),
     supabase.from("portal_settings").select("project_duration_days").eq("id",1).single(),
    ]);
    if(projectError)throw projectError;
    if(settingsError)throw settingsError;
    if(!active)return;
    setProject(data as Record<string,unknown>);
    setProjectDuration(settings.project_duration_days);
   }catch(reason){
    if(active)setError(reason instanceof Error?reason.message:"Unable to load project details.");
   }finally{
    if(active)setLoading(false);
   }
  }
  void load();
  return ()=>{active=false;};
 },[projectId]);
 async function allocate(){
  setAllocating(true);setError("");
  try{
   const {data,error:rpcError}=await createClient().rpc("allocate_project",{p_project_id:projectId});
   if(rpcError)throw rpcError;
   if(!data)throw new Error("Allocation was not confirmed by the server.");
   setConfirm(false);startPageTransition("/student/my-project");router.push("/student/my-project");router.refresh();
  }catch(reason){setError(reason instanceof Error?reason.message:"Project allocation failed.");}
  finally{setAllocating(false);}
 }
 const req=project?.requirements as Record<string,unknown>|undefined;
 const subject=project?.subjects as {subject_name?:string}|null|undefined;
 const sections=project?[
  ["Problem Statement",project.problem_statement],
  ["Project Objectives",project.objectives],
  ...Object.entries(req??{}).map(([key,value])=>[key.replaceAll("_"," ").replace(/\b\w/g,x=>x.toUpperCase()),Array.isArray(value)?value.join(", "):String(value??"")]),
 ]:null;
 return <DashboardShell role="student" title="Project Details" description="Review the complete requirements before allocating.">
  <Link href="/student/projects" className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500"><ArrowLeft size={14}/>Back to projects</Link>
  <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
   <div className="product-card rounded-3xl border border-white bg-white/90 p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,.35)] backdrop-blur">
    {loading?<p className="text-sm text-slate-500">Loading project…</p>:error&&isSupabaseConfigured?<p role="alert" className="text-sm text-red-600">{error}</p>:project?<><span className="text-[10px] font-bold text-blue-600">{String(project.project_code)} · {subject?.subject_name}</span><h1 className="mt-3 text-2xl font-bold">{String(project.title)}</h1><p className="mt-2 text-sm text-slate-500">{String(project.description??"")}</p><div className="mt-6 space-y-6 text-sm">{sections?.map(([h,t])=><section key={String(h)}><h2 className="font-bold">{String(h)}</h2><p className="mt-2 leading-6 text-slate-500">{Array.isArray(t)?t.join(", "):String(t??"Not specified")}</p></section>)}</div></>:<><span className="text-[10px] font-bold text-blue-600">PRJ-WD-104 · WEB DEVELOPMENT</span><h1 className="mt-3 text-2xl font-bold">Campus Connect Portal</h1><p className="mt-2 text-sm text-slate-500">A secure community platform for campus announcements, events and student collaboration.</p><div className="mt-6 space-y-6 text-sm">{[
      ["Problem Statement","Students need one centralized place to discover campus events, submit project collaborations and receive time-sensitive announcements."],
      ["Project Objectives","Create a responsive portal with event discovery, registration, community posts and an accessible faculty announcement feed."],
      ["Functional Requirements","Authentication, event listing and filtering, registration workflow, post creation, search, profile management and notifications."],
      ["Technical Requirements","Next.js or React, Tailwind CSS, TypeScript, Supabase Authentication and PostgreSQL, and Vercel deployment."],
      ["Required Pages","Homepage, Events, Event Details, Community, Create Post, Profile, Login and Registration."],
      ["Submission Guidelines","Deploy on Vercel with a public GitHub repository. Submit both links and a detailed project description."]
    ].map(([h,t])=> <section key={h}><h2 className="font-bold">{h}</h2><p className="mt-2 leading-6 text-slate-500">{t}</p></section>)}</div></>}
   </div>
   <aside className="product-card h-fit rounded-3xl border border-white bg-white/90 p-5 shadow-sm backdrop-blur"><h2 className="text-sm font-bold">Allocation checklist</h2><div className="mt-4 space-y-3 text-xs text-slate-500"><div className="flex justify-between"><span>Difficulty</span><b className="text-orange-600">{String(project?.difficulty??"Medium")}</b></div><div className="flex justify-between"><span>Duration</span><b>{projectDuration} {projectDuration===1?"day":"days"}</b></div><div className="flex justify-between"><span>Available seats</span><b>1</b></div></div><label className="mt-5 flex cursor-pointer gap-3 rounded-xl bg-slate-50 p-3 text-xs leading-5"><input type="checkbox" checked={read} onChange={e=>setRead(e.target.checked)} className="mt-0.5 accent-blue-600"/><span>I have read and understood the complete project requirements.</span></label>{!isSupabaseConfigured&&<p className="mt-3 text-[10px] leading-4 text-amber-700">Allocation requires a configured Supabase project; this is demo data.</p>}<button disabled={!read||loading||!isSupabaseConfigured} onClick={()=>setConfirm(true)} className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-blue-600/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">Confirm project</button></aside>
  </div>
  {confirm&&<div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/45 px-5 backdrop-blur-sm"><div role="alertdialog" aria-modal="true" className="animate-in w-full max-w-md rounded-3xl border border-white/70 bg-white p-6 shadow-2xl"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><AlertTriangle size={21}/></div><h2 className="mt-5 text-lg font-bold">Confirm project allocation</h2><p className="mt-2 text-sm leading-6 text-slate-500">You are about to select this project. Once confirmed, it will be assigned exclusively to your account. Another student will not be able to select this project.</p>{error&&<><p role="alert" className="mt-3 text-xs text-red-600">{error}</p>{error.toLowerCase().includes("already have an active project")&&<Link href="/student/my-project" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-blue-600">Manage your current project <ArrowLeft size={13}/></Link>}</>}<div className="mt-6 flex gap-3"><button onClick={()=>setConfirm(false)} disabled={allocating} className="h-10 flex-1 rounded-xl border border-slate-200 text-xs font-bold">Cancel</button><button aria-busy={allocating} onClick={allocate} disabled={allocating} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-lg shadow-blue-600/20 disabled:opacity-50"><LockKeyhole size={14}/>{allocating?"Allocating…":"Confirm and allocate"}</button></div></div></div>}
 </DashboardShell>;
}

export default function ProjectDetails({params}:{params:Promise<{projectId:string}>}){
 return <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading project…</div>}><ProjectDetailsContent params={params}/></Suspense>;
}
