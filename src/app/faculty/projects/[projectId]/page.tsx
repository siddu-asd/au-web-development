import { Suspense } from "react";
import { ProjectDetailPage } from "@/app/admin/projects/[projectId]/page";
export default function FacultyProjectDetail({params}:{params:Promise<{projectId:string}>}){return <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading project…</div>}><ProjectDetailPage params={params} role="faculty"/></Suspense>}
