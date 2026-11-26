"use client";

import Link from "next/link";
import {
  Bell,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  Settings,
  Users,
  FolderKanban,
  ArrowRightLeft,
  ChartNoAxesCombined,
  CircleUserRound,
  GraduationCap,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./logo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";
import { startPageTransition } from "@/components/page-transition-loader";

type Role = "admin" | "faculty" | "student";

const adminItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Manage Subjects", href: "/admin/subjects", icon: LibraryBig },
  { label: "Manage Projects", href: "/admin/projects", icon: FolderKanban },
  { label: "Project Allocations", href: "/admin/allocations", icon: ArrowRightLeft },
  { label: "Student Management", href: "/admin/students", icon: Users },
  { label: "Progress Monitoring", href: "/admin/progress", icon: ClipboardCheck },
  { label: "Submissions", href: "/admin/submissions", icon: GraduationCap },
  { label: "Reports & Analytics", href: "/admin/reports", icon: ChartNoAxesCombined },
  { label: "Faculty Management", href: "/admin/faculty", icon: Users },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
];

const studentItems = [
  { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
  { label: "Browse Subjects", href: "/student/subjects", icon: LibraryBig },
  { label: "Available Projects", href: "/student/projects", icon: BookOpen },
  { label: "My Project", href: "/student/my-project", icon: FolderKanban },
  { label: "Daily Progress", href: "/student/progress", icon: ClipboardCheck },
  { label: "My Submission", href: "/student/submission", icon: GraduationCap },
  { label: "Notifications", href: "/student/notifications", icon: Bell },
  { label: "My Profile", href: "/student/profile", icon: CircleUserRound },
];
const facultyItems = [
  adminItems[0],
  { label: "Assigned Subjects", href: "/faculty/subjects", icon: LibraryBig },
  { label: "Projects", href: "/faculty/projects", icon: FolderKanban },
  { label: "Project Allocations", href: "/faculty/allocations", icon: ArrowRightLeft },
  { label: "Progress Monitoring", href: "/faculty/progress", icon: ClipboardCheck },
  { label: "Submissions", href: "/faculty/submissions", icon: GraduationCap },
  { label: "Notifications", href: "/faculty/notifications", icon: Bell },
];

export function DashboardShell({
  role,
  title,
  description,
  children,
}: {
  role: Role;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [profileName,setProfileName]=useState(isSupabaseConfigured?"Account":role==="admin"?"Aisha Malik":role==="faculty"?"Faculty Demo":"Student Demo");
  const [unreadCount,setUnreadCount]=useState(0);
  const [shellError,setShellError]=useState("");
  const [signingOut,setSigningOut]=useState(false);
  const router=useRouter();
  const pathname=usePathname();
  useEffect(()=>{
    if(!open)return;
    function closeOnEscape(event:KeyboardEvent){
      if(event.key==="Escape")setOpen(false);
    }
    window.addEventListener("keydown",closeOnEscape);
    return ()=>window.removeEventListener("keydown",closeOnEscape);
  },[open]);
  useEffect(()=>{
    const navigation=document.getElementById("dashboard-navigation");
    const activeLink=navigation?.querySelector<HTMLElement>('[aria-current="page"]');
    if(!navigation||!activeLink)return;
    const navigationBounds=navigation.getBoundingClientRect();
    const linkBounds=activeLink.getBoundingClientRect();
    if(linkBounds.top<navigationBounds.top||linkBounds.bottom>navigationBounds.bottom){
      navigation.scrollTo({
        top:navigation.scrollTop+linkBounds.top-navigationBounds.top-(navigationBounds.height-linkBounds.height)/2,
        behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",
      });
    }
  },[pathname]);
  useEffect(()=>{
    if(!isSupabaseConfigured)return;
    let active=true;
    async function loadProfile(){
      try {
        const supabase=createClient();
        const {data:{user},error:userError}=await supabase.auth.getUser();
        if(userError)throw userError;
        if(!user)return;
        const [{data:profile,error:profileError},{count,error:notificationError}] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle(),
          supabase.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
        ]);
        if(profileError)throw profileError;
        if(notificationError)throw notificationError;
        if(active){
          if(profile?.full_name)setProfileName(profile.full_name);
          setUnreadCount(count??0);
        }
      } catch(reason) {
        if(active)setShellError(reason instanceof Error?reason.message:"Unable to load account details.");
      }
    }
    void loadProfile();
    return ()=>{active=false;};
  },[]);
  async function logout(){
    if(signingOut)return;
    setSigningOut(true);
    setShellError("");
    try {
      if(isSupabaseConfigured){
        const {error}=await createClient().auth.signOut();
        if(error)throw error;
      }
      const destination = role==="faculty"?"/faculty/login":"/login";
      startPageTransition(destination);
      router.replace(destination);
      router.refresh();
    } catch(reason) {
      setShellError(reason instanceof Error?reason.message:"Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  }
  const items = role === "admin" ? adminItems : role === "faculty" ? facultyItems : studentItems;
  const profileHref=role==="admin"?"/admin/settings":role==="student"?"/student/profile":"/faculty/dashboard";
  const notificationHref=role==="faculty"?"/faculty/notifications":`/${role}/notifications`;
  const initials=profileName.split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]?.toUpperCase()).join("")||"U";

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#f4f6fb] text-slate-900">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="ambient-glow absolute -right-36 -top-56 h-[34rem] w-[34rem] rounded-full bg-blue-200/30 blur-[110px]"/>
        <div className="absolute -bottom-64 left-[34%] h-[30rem] w-[30rem] rounded-full bg-violet-200/20 blur-[120px]"/>
      </div>
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col overflow-hidden border-r border-white/[0.07] bg-[#111a2e] shadow-[20px_0_70px_-45px_rgba(15,23,42,.7)] transition-transform duration-300 motion-reduce:transition-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[82px] flex-none items-center justify-between border-b border-white/[0.07] px-5">
          <Logo tone="inverse"/>
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={19} />
          </button>
        </div>
        <nav id="dashboard-navigation" className="nav-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5">
          <div className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.19em] text-slate-500">
            {role === "admin" ? "Administration" : role === "faculty" ? "Faculty portal" : "Student portal"}
          </div>
          <div className="space-y-1.5">
            {items.map((item) => {
              const active = pathname===item.href||pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active?"page":undefined}
                  className={`group relative flex h-11 items-center gap-3 rounded-xl px-3 text-[12px] font-semibold transition-colors ${
                    active
                      ? "bg-blue-500/15 text-blue-200 ring-1 ring-inset ring-blue-300/10"
                      : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <Icon size={17} strokeWidth={active ? 2.4 : 1.9} className={active?"text-blue-300":"text-slate-500 transition-colors group-hover:text-slate-300"}/>
                  {item.label}
                  {active&&<span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_12px_rgba(147,197,253,.8)]"/>}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="flex-none border-t border-white/[0.07] p-3">
          <Link
            href={profileHref}
            className="flex h-10 items-center gap-3 rounded-xl px-3 text-[12px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {role==="student"?<CircleUserRound size={17}/>:role==="faculty"?<LayoutDashboard size={17}/>:<Settings size={17}/>}
            {role==="student"?"My profile":role==="faculty"?"Faculty dashboard":"Settings"}
          </Link>
          <button aria-busy={signingOut} onClick={()=>void logout()} disabled={signingOut} className="mt-1 flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[12px] font-semibold text-rose-300 transition-colors hover:bg-rose-400/10 disabled:cursor-wait disabled:opacity-60">
            <LogOut size={17} /> {signingOut?"Signing out…":"Logout"}
          </button>
        </div>
      </aside>

      <div className="relative z-10 lg:pl-[272px]">
        <header className="sticky top-0 z-30 flex h-[78px] items-center justify-between border-b border-white/80 bg-white/75 px-4 shadow-[0_8px_30px_-28px_rgba(15,23,42,.3)] backdrop-blur-2xl lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition-colors hover:bg-white lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="dashboard-navigation"
            >
              <Menu size={19} />
            </button>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold tracking-wide text-slate-400">PROJECTHUB <span className="px-1 text-slate-300">/</span> {title}</div>
              <h1 className="mt-0.5 truncate text-[15px] font-bold tracking-tight text-slate-950">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={notificationHref} onClick={()=>setOpen(false)} aria-label={`Notifications${unreadCount?`, ${unreadCount} unread`:""}`} className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-500 shadow-sm transition-colors hover:bg-white hover:text-slate-900">
              <Bell size={18} />
              {unreadCount>0&&<span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold text-white">{unreadCount>9?"9+":unreadCount}</span>}
            </Link>
            <Link href={profileHref} onClick={()=>setOpen(false)} aria-label={`Open ${profileName} account`} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-2 pr-3 shadow-sm transition-colors hover:bg-white">
              <div className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-white ${role==="faculty"?"bg-gradient-to-br from-violet-500 to-indigo-600":"bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
                {initials}
              </div>
              <div className="hidden text-left sm:block">
                <div className="max-w-36 truncate text-xs font-bold text-slate-800">{profileName}</div>
                <div className="text-[10px] text-slate-400">{role === "admin" ? "Super Admin" : role === "faculty" ? "Faculty" : "Student"}</div>
              </div>
              <ChevronDown size={14} className="text-slate-400"/>
            </Link>
          </div>
        </header>
        <main className="dashboard-enter mx-auto w-full max-w-[1680px] p-4 sm:p-6 lg:p-8">
          {shellError&&<p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{shellError}</p>}
          {description && (
            <div className="mb-6">
              <p className="text-sm text-slate-500">{description}</p>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
