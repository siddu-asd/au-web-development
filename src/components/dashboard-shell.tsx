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
import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "./logo";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

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
  const [profileName,setProfileName]=useState(role==="admin"?"Aisha Malik":"Rahul Kumar");
  const [unreadCount,setUnreadCount]=useState(0);
  const router=useRouter();
  useEffect(()=>{
    if(!isSupabaseConfigured)return;
    let active=true;
    async function loadProfile(){
      const supabase=createClient();
      const {data:{user}}=await supabase.auth.getUser();
      if(!user)return;
      const [{data:profile},{count}] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle(),
        supabase.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
      ]);
      if(active){
        if(profile?.full_name)setProfileName(profile.full_name);
        setUnreadCount(count??0);
      }
    }
    void loadProfile();
    return ()=>{active=false;};
  },[]);
  async function logout(){
    if(isSupabaseConfigured)await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  const items = role === "admin" ? adminItems : role === "faculty" ? facultyItems : studentItems;

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] border-r border-slate-200/80 bg-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[76px] items-center justify-between px-6">
          <Logo />
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav className="px-3 py-3">
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            {role === "admin" ? "Administration" : role === "faculty" ? "Faculty portal" : "Student portal"}
          </div>
          <div className="space-y-1">
            {items.map((item) => {
              const active = false;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon size={17} strokeWidth={active ? 2.4 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="absolute bottom-0 w-full border-t border-slate-100 p-3">
          <Link
            href={role === "admin" ? "/admin/settings" : role === "faculty" ? "/faculty/dashboard" : "/student/profile"}
            className="flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Settings size={17} /> Settings
          </Link>
          <button onClick={logout} className="mt-1 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-red-500 hover:bg-red-50">
            <LogOut size={17} /> Logout
          </button>
        </div>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={19} />
            </button>
            <div>
              <div className="text-[11px] font-medium text-slate-400">Workspace / {title}</div>
              <h1 className="mt-0.5 text-[16px] font-bold text-slate-950">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={role==="admin"?"/admin/notifications":role==="faculty"?"/faculty/submissions":"/student/notifications"} aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
              <Bell size={18} />
              {unreadCount>0&&<span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold text-white">{unreadCount>9?"9+":unreadCount}</span>}
            </Link>
            <button className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-2 pr-3">
              <div className="grid h-7 w-7 place-items-center rounded-md bg-blue-600 text-xs font-bold text-white">
                {role === "admin" ? "AM" : "RK"}
              </div>
              <div className="hidden text-left sm:block">
                <div className="text-xs font-bold text-slate-800">
                  {profileName}
                </div>
                <div className="text-[10px] text-slate-400">                {role === "admin" ? "Super Admin" : role === "faculty" ? "Faculty" : "Student"}</div>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
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
