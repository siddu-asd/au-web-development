import { DashboardShell } from "@/components/dashboard-shell";
import { SubjectProjectFolders } from "@/components/subject-project-folders";

export default function Projects() {
  return (
    <DashboardShell role="admin" title="Manage Projects" description="Browse and manage projects inside their subject folders.">
      <SubjectProjectFolders role="admin"/>
    </DashboardShell>
  );
}
