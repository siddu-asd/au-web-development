"use client";

import { Suspense, use, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { AlertTriangle, ArrowLeft, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

function ProjectDetailsContent({params}:{params:Promise<{projectId:string}>}){
 const {projectId}=use(params);
 const [read,setRead]=useState(false); const [confirm,setConfirm]=useState(false);
 const [project,setProject]=useState<Record<string,unknown>|null>(null);
 const [loading,setLoading]=useState(isSupabaseConfigured);
 const [error,setError]=useState("");
 const [allocating,setAllocating]=useState(false);
 const router=useRouter();
 useEffect(()=>{
  if(!isSupabaseConfigured)return;
  let active=true;
  createClient().from("projects").select("id,project_code,title,description,problem_statement,objectives,requirements,technologies,difficulty,subjects(subject_name)").eq("id",projectId).eq("status","PUBLISHED").single().then(({data,error})=>{
   if(!active)return;
   if(error){setError(error.message);setLoading(false);return;}
   setProject(data as Record<string,unknown>);setLoading(false);
  });
  return ()=>{active=false;};
 },[projectId]);
 async function allocate(){
  setAllocating(true);setError("");
  try{
   const {data,error:rpcError}=await createClient().rpc("allocate_project",{p_project_id:projectId});
   if(rpcError)throw rpcError;
   if(!data)throw new Error("Allocation was not confirmed by the server.");
   setConfirm(false);router.push("/student/my-project");router.refresh();
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
   <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
    {loading?<p className="text-sm text-slate-500">Loading project…</p>:error&&isSupabaseConfigured?<p role="alert" className="text-sm text-red-600">{error}</p>:project?<><span className="text-[10px] font-bold text-blue-600">{String(project.project_code)} · {subject?.subject_name}</span><h1 className="mt-3 text-2xl font-bold">{String(project.title)}</h1><p className="mt-2 text-sm text-slate-500">{String(project.description??"")}</p><div className="mt-6 space-y-6 text-sm">{sections?.map(([h,t])=><section key={String(h)}><h2 className="font-bold">{String(h)}</h2><p className="mt-2 leading-6 text-slate-500">{Array.isArray(t)?t.join(", "):String(t??"Not specified")}</p></section>)}</div></>:<><span className="text-[10px] font-bold text-blue-600">PRJ-WD-104 · WEB DEVELOPMENT</span><h1 className="mt-3 text-2xl font-bold">Campus Connect Portal</h1><p className="mt-2 text-sm text-slate-500">A secure community platform for campus announcements, events and student collaboration.</p><div className="mt-6 space-y-6 text-sm">{[
      ["Problem Statement","Students need one centralized place to discover campus events, submit project collaborations and receive time-sensitive announcements."],
      ["Project Objectives","Create a responsive portal with event discovery, registration, community posts and an accessible faculty announcement feed."],
      ["Functional Requirements","Authentication, event listing and filtering, registration workflow, post creation, search, profile management and notifications."],
      ["Technical Requirements","Next.js or React, Tailwind CSS, TypeScript, Supabase Authentication and PostgreSQL, and Vercel deployment."],
      ["Required Pages","Homepage, Events, Event Details, Community, Create Post, Profile, Login and Registration."],
      ["Submission Guidelines","Deploy on Vercel with a public GitHub repository. Submit both links and a detailed project description."]
    ].map(([h,t])=> <section key={h}><h2 className="font-bold">{h}</h2><p className="mt-2 leading-6 text-slate-500">{t}</p></section>)}</div></>}
   </div>
   <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-bold">Allocation checklist</h2><div className="mt-4 space-y-3 text-xs text-slate-500"><div className="flex justify-between"><span>Difficulty</span><b className="text-orange-600">{String(project?.difficulty??"Medium")}</b></div><div className="flex justify-between"><span>Duration</span><b>10 days</b></div><div className="flex justify-between"><span>Available seats</span><b>1</b></div></div><label className="mt-5 flex cursor-pointer gap-3 rounded-lg bg-slate-50 p-3 text-xs leading-5"><input type="checkbox" checked={read} onChange={e=>setRead(e.target.checked)} className="mt-0.5 accent-blue-600"/><span>I have read and understood the complete project requirements.</span></label>{!isSupabaseConfigured&&<p className="mt-3 text-[10px] leading-4 text-amber-700">Allocation requires a configured Supabase project; this is demo data.</p>}<button disabled={!read||loading||!isSupabaseConfigured} onClick={()=>setConfirm(true)} className="mt-4 h-11 w-full rounded-lg bg-blue-600 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">Confirm project</button></aside>
  </div>
  {confirm&&<div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 px-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="grid h-11 w-11 place-items-center rounded-full bg-orange-50 text-orange-600"><AlertTriangle size={21}/></div><h2 className="mt-5 text-lg font-bold">Confirm project allocation</h2><p className="mt-2 text-sm leading-6 text-slate-500">You are about to select this project. Once confirmed, it will be assigned exclusively to your account. Another student will not be able to select this project.</p>{error&&<p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}<div className="mt-6 flex gap-3"><button onClick={()=>setConfirm(false)} disabled={allocating} className="h-10 flex-1 rounded-lg border border-slate-200 text-xs font-bold">Cancel</button><button onClick={allocate} disabled={allocating} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-bold text-white disabled:opacity-50"><LockKeyhole size={14}/>{allocating?"Allocating…":"Confirm and allocate"}</button></div></div></div>}
 </DashboardShell>;
}

export default function ProjectDetails({params}:{params:Promise<{projectId:string}>}){
 return <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading project…</div>}><ProjectDetailsContent params={params}/></Suspense>;
}
