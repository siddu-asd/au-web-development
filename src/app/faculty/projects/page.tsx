import { DashboardShell } from "@/components/dashboard-shell";
import { SubjectProjectFolders } from "@/components/subject-project-folders";

export default function FacultyProjects() {
  return (
    <DashboardShell role="faculty" title="Faculty Projects" description="Browse projects grouped into your assigned subject folders.">
      <SubjectProjectFolders role="faculty"/>
    </DashboardShell>
  );
}
