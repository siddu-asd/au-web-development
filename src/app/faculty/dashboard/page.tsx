import { AdminTablePage } from "@/components/admin-table-page";
import { SubjectProjectFolders } from "@/components/subject-project-folders";
export default function FacultyDashboard(){return <AdminTablePage role="faculty" dataSource="allocations" title="Faculty Dashboard" description="Monitor projects and submissions for your assigned subjects." columns={["Student","Project","Subject","Allocated","Deadline","Status"]} rows={[]}><SubjectProjectFolders role="faculty" compact/></AdminTablePage>}
