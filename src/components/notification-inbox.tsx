"use client";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";
import { Bell, CheckCheck } from "lucide-react";

type Role="admin"|"faculty"|"student";
type Notice={id:string;title:string;message:string;notification_type:string;is_read:boolean;created_at:string};
const demoNotices:Notice[]=[
 {id:"demo-1",title:"Project allocated",message:"Campus Connect Portal was assigned to your account.",notification_type:"PROJECT_ALLOCATED",is_read:false,created_at:new Date().toISOString()},
 {id:"demo-2",title:"Deadline approaching",message:"Your project deadline is in 6 days.",notification_type:"DEADLINE_APPROACHING",is_read:false,created_at:new Date(Date.now()-86400000).toISOString()},
];
export function NotificationInbox({role}:{role:Role}){
 const [items,setItems]=useState<Notice[]>(demoNotices);const [loading,setLoading]=useState(isSupabaseConfigured);const [error,setError]=useState("");const [busy,setBusy]=useState<string|null>(null);
 useEffect(()=>{if(!isSupabaseConfigured)return;let active=true;createClient().from("notifications").select("id,title,message,notification_type,is_read,created_at").order("created_at",{ascending:false}).then(({data,error})=>{if(!active)return;if(error)setError(error.message);else setItems((data??[]) as Notice[]);setLoading(false);});return()=>{active=false;};},[]);
 async function markRead(id:string){
  if(!isSupabaseConfigured){setItems(rows=>rows.map(row=>row.id===id?{...row,is_read:true}:row));return;}
  if(busy)return;
  setBusy(id);setError("");
  try{const {error:updateError}=await createClient().from("notifications").update({is_read:true}).eq("id",id);
   if(updateError)throw updateError;setItems(rows=>rows.map(row=>row.id===id?{...row,is_read:true}:row));
  }catch(reason){setError(reason instanceof Error?reason.message:"Unable to mark notification as read.");}
  finally{setBusy(null);}
 }
 async function markAllRead(){
  if(!isSupabaseConfigured){setItems(rows=>rows.map(row=>({...row,is_read:true})));return;}
  if(busy)return;
  setBusy("all");setError("");
  try{const {error:updateError}=await createClient().from("notifications").update({is_read:true}).eq("is_read",false);
   if(updateError)throw updateError;setItems(rows=>rows.map(row=>({...row,is_read:true})));
  }catch(reason){setError(reason instanceof Error?reason.message:"Unable to mark notifications as read.");}
  finally{setBusy(null);}
 }
 return <DashboardShell role={role} title="Notifications" description="Review recent project updates and reminders.">
  {!isSupabaseConfigured&&<p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Demo notifications are not persisted.</p>}
  <div className="mx-auto max-w-3xl">{error&&<p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}<div className="mb-3 flex justify-end"><button type="button" aria-busy={busy==="all"} disabled={loading||busy!==null||items.every(item=>item.is_read)} onClick={()=>void markAllRead()} className="flex items-center gap-2 text-xs font-bold text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck size={15}/>{busy==="all"?"Marking as read…":"Mark all as read"}</button></div>
   <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">{loading?<p className="p-8 text-center text-sm text-slate-500">Loading notifications…</p>:items.map(item=><button type="button" key={item.id} aria-busy={busy===item.id} disabled={item.is_read||busy!==null} onClick={()=>!item.is_read&&void markRead(item.id)} className={`flex w-full gap-4 border-b border-slate-100 p-5 text-left last:border-0 disabled:cursor-default ${item.is_read?"bg-white":"bg-blue-50/40"}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><Bell size={17}/></div><div className="flex-1"><h2 className="text-xs font-bold">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{item.message}</p><div className="mt-2 text-[10px] text-slate-400">{new Date(item.created_at).toLocaleString()}</div></div>{!item.is_read&&<span className="mt-1 h-2 w-2 rounded-full bg-blue-600"/>}</button>)}{!loading&&items.length===0&&<p className="p-8 text-center text-sm text-slate-500">You&apos;re all caught up.</p>}</div>
  </div>
 </DashboardShell>;
}
