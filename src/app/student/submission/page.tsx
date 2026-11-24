"use client";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { CheckCircle2, ExternalLink, GitBranch } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

type SubmissionRecord={id:string;vercel_url:string;github_url:string;description:string;submission_version:number;submission_status:string;submitted_at:string;faculty_feedback:string|null};
export default function Submission(){
 const [allocationId,setAllocationId]=useState("");
 const [allocationStatus,setAllocationStatus]=useState("");
 const [submissions,setSubmissions]=useState<SubmissionRecord[]>([]);
 const [vercelUrl,setVercelUrl]=useState("");
 const [githubUrl,setGithubUrl]=useState("");
 const [description,setDescription]=useState("");
 const [notes,setNotes]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(isSupabaseConfigured);
 useEffect(()=>{
  if(!isSupabaseConfigured)return;
  let active=true;
  async function load(){
   const supabase=createClient();
   const {data:allocation,error:allocationError}=await supabase.from("project_allocations").select("id,status").order("allocation_date",{ascending:false}).limit(1).maybeSingle();
   if(!active)return;
   if(allocationError){setError(allocationError.message);setLoading(false);return;}
   if(!allocation){setLoading(false);return;}
   setAllocationId(allocation.id);setAllocationStatus(allocation.status);
   const {data,error:submissionError}=await supabase.from("project_submissions").select("id,vercel_url,github_url,description,submission_version,submission_status,submitted_at,faculty_feedback").eq("allocation_id",allocation.id).order("submission_version",{ascending:false});
   if(!active)return;
   if(submissionError)setError(submissionError.message);else setSubmissions((data??[]) as SubmissionRecord[]);
   setLoading(false);
  }
  void load();return()=>{active=false;};
 },[]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");
  if(!window.confirm("Submit this project version for faculty review?"))return;
  if(!isSupabaseConfigured){setError("Demo mode: submission is not saved. Configure Supabase to enable submissions.");return;}
  if(!allocationId){setError("You need an active project allocation before submitting.");return;}
  setBusy(true);
  try{
   const {data,error:rpcError}=await createClient().rpc("submit_project",{p_allocation_id:allocationId,p_vercel_url:vercelUrl,p_github_url:githubUrl,p_description:description,p_notes:notes});
   if(rpcError)throw rpcError;
   if(!data)throw new Error("The server did not confirm the submission.");
   const {data:updated,error:readError}=await createClient().from("project_submissions").select("id,vercel_url,github_url,description,submission_version,submission_status,submitted_at,faculty_feedback").eq("allocation_id",allocationId).order("submission_version",{ascending:false});
   if(readError)throw readError;
   setSubmissions((updated??[]) as SubmissionRecord[]);
   setAllocationStatus("SUBMITTED");
   setVercelUrl("");setGithubUrl("");setDescription("");setNotes("");
  }catch(reason){setError(reason instanceof Error?reason.message:"Submission failed.");}
  finally{setBusy(false);}
 }
 return <DashboardShell role="student" title="My Submission" description="Submit your deployed website and source repository.">
  {loading?<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading your submission…</div>:isSupabaseConfigured&&!allocationId?<div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><h2 className="font-bold">No project allocation</h2><p className="mt-2 text-sm text-slate-500">Allocate a project before submitting.</p></div>:
  <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
   <div className="flex items-center justify-between"><div><span className="text-[10px] font-bold text-blue-600">FINAL PROJECT</span><h1 className="mt-2 text-xl font-bold">Project submission</h1></div>{submissions[0]?<span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1.5 text-[10px] font-bold text-green-600"><CheckCircle2 size={13}/>{submissions[0].submission_status}</span>:<span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500">Not submitted</span>}</div>
   {submissions[0]?.faculty_feedback&&<div className="mt-5 rounded-lg border border-orange-100 bg-orange-50 p-4 text-xs"><b>Faculty feedback</b><p className="mt-1 whitespace-pre-wrap text-slate-600">{submissions[0].faculty_feedback}</p></div>}
   {!isSupabaseConfigured&&<p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo mode: submissions are not persisted.</p>}
   {(!submissions.length||allocationStatus==="CHANGES_REQUESTED")?<form onSubmit={submit} className="mt-7 space-y-5">
    <label className="block"><span className="mb-2 block text-xs font-bold">Vercel deployment URL</span><div className="relative"><ExternalLink className="absolute left-3 top-3 text-slate-400" size={16}/><input required type="url" pattern="https://.+\.vercel\.app(/.*)?" value={vercelUrl} onChange={e=>setVercelUrl(e.target.value)} placeholder="https://campus-connect.vercel.app" className="h-11 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"/></div></label>
    <label className="block"><span className="mb-2 block text-xs font-bold">GitHub repository URL</span><div className="relative"><GitBranch className="absolute left-3 top-3 text-slate-400" size={16}/><input required type="url" pattern="https://github\.com/[^/]+/[^/]+.*" value={githubUrl} onChange={e=>setGithubUrl(e.target.value)} placeholder="https://github.com/username/campus-connect" className="h-11 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm"/></div></label>
    <label className="block"><span className="mb-2 block text-xs font-bold">Final project description</span><textarea required minLength={10} maxLength={10000} rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the features, technologies and implementation..." className="w-full rounded-lg border border-slate-200 p-3 text-sm"/></label>
    <label className="block"><span className="mb-2 block text-xs font-bold">Additional notes <span className="font-normal text-slate-400">(optional)</span></span><textarea maxLength={5000} rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full rounded-lg border border-slate-200 p-3 text-sm"/></label>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    <button disabled={busy||!isSupabaseConfigured} className="h-12 w-full rounded-lg bg-blue-600 text-sm font-bold text-white disabled:opacity-50">{busy?"Submitting…":submissions.length?"Submit correction version":"Submit final project"}</button>
   </form>:<p className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">Your latest submission is under faculty review. You can submit another version after changes are requested.</p>}
   {submissions.length>0&&<section className="mt-8 border-t border-slate-100 pt-5"><h2 className="text-sm font-bold">Submission history</h2><div className="mt-3 space-y-3">{submissions.map(item=><div key={item.id} className="rounded-lg border border-slate-100 p-4 text-xs"><div className="flex justify-between"><b>Version {item.submission_version}</b><span>{item.submission_status}</span></div><p className="mt-2 text-slate-500">{new Date(item.submitted_at).toLocaleString()}</p><a className="mt-2 block text-blue-600 underline" href={item.vercel_url} target="_blank" rel="noreferrer">Open deployment</a></div>)}</div></section>}
  </div>}
 </DashboardShell>;
}
