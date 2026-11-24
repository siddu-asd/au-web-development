"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FileSpreadsheet, Upload } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/demo";

type PortalRole = "admin" | "faculty";
type ParsedProject = {
  rowNumber: number;
  subjectCode: string;
  projectCode: string;
  title: string;
  description: string;
  problemStatement: string;
  objectives: string;
  difficulty: "Easy" | "Medium" | "Hard";
  functionalRequirements: string[];
  technologies: string[];
  status: "DRAFT" | "PUBLISHED";
};

const requiredHeaders = [
  "subject_code",
  "project_code",
  "title",
  "description",
  "problem_statement",
  "difficulty",
  "functional_requirements",
];
const templateHeaders = [
  ...requiredHeaders.slice(0, 5),
  "objectives",
  ...requiredHeaders.slice(5),
  "technologies",
  "status",
];

const template = [
  templateHeaders.join(","),
  'WEB101,PRJ-WEB-201,Campus Event Hub,"A portal for campus events","Students need one place to discover events","Improve campus participation",Medium,"Browse events|Register for events|Manage registrations","Next.js|TypeScript|Supabase",DRAFT',
].join("\r\n");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("The CSV contains a quotation mark that was not closed.");
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function downloadTemplate() {
  const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "projecthub-project-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ProjectCsvImport({ role }: { role: PortalRole }) {
  const [fileName, setFileName] = useState("");
  const [projects, setProjects] = useState<ParsedProject[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const projectsPath = role === "admin" ? "/admin/projects" : "/faculty/projects";

  async function loadFile(file?: File) {
    setError("");
    setNotice("");
    setProjects([]);
    setIssues([]);
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a .csv file.");
      return;
    }
    if (file.size > 1_000_000) {
      setError("The CSV file must be smaller than 1 MB.");
      return;
    }

    try {
      const rows = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
      const headers = rows.shift()?.map((header) => header.trim().toLowerCase()) ?? [];
      const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
      if (missingHeaders.length) {
        throw new Error(`Missing required columns: ${missingHeaders.join(", ")}.`);
      }
      if (rows.length === 0) throw new Error("The CSV has a header row but no project rows.");
      if (rows.length > 200) throw new Error("Import up to 200 projects per CSV file.");

      const columnIndex = new Map(headers.map((header, index) => [header, index]));
      const get = (cells: string[], header: string) => {
        const index = columnIndex.get(header);
        return index === undefined ? "" : cells[index]?.trim() ?? "";
      };
      const validProjects: ParsedProject[] = [];
      const rowIssues: string[] = [];
      const seenCodes = new Set<string>();

      rows.forEach((cells, index) => {
        if (cells.every((cell) => cell.trim() === "")) return;
        const rowNumber = index + 2;
        const projectCode = get(cells, "project_code").toUpperCase();
        const subjectCode = get(cells, "subject_code").toUpperCase();
        const title = get(cells, "title");
        const description = get(cells, "description");
        const problemStatement = get(cells, "problem_statement");
        const difficultyValue = get(cells, "difficulty").toLowerCase();
        const statusValue = get(cells, "status").toUpperCase() || "DRAFT";
        const functionalRequirements = get(cells, "functional_requirements").split("|").map((value) => value.trim()).filter(Boolean);
        const technologies = get(cells, "technologies").split("|").map((value) => value.trim()).filter(Boolean);
        const rowErrors: string[] = [];

        if (!subjectCode) rowErrors.push("subject_code is required");
        if (!projectCode) rowErrors.push("project_code is required");
        else if (projectCode.length > 32) rowErrors.push("project_code must be 32 characters or fewer");
        if (!title) rowErrors.push("title is required");
        else if (title.length > 150) rowErrors.push("title must be 150 characters or fewer");
        if (!description) rowErrors.push("description is required");
        else if (description.length > 2000) rowErrors.push("description must be 2,000 characters or fewer");
        if (!problemStatement) rowErrors.push("problem_statement is required");
        if (!["easy", "medium", "hard"].includes(difficultyValue)) rowErrors.push("difficulty must be Easy, Medium, or Hard");
        if (!functionalRequirements.length) rowErrors.push("add at least one functional requirement");
        if (!["DRAFT", "PUBLISHED"].includes(statusValue)) rowErrors.push("status must be DRAFT or PUBLISHED");
        if (projectCode && seenCodes.has(projectCode)) rowErrors.push("project_code is duplicated in this file");
        if (projectCode) seenCodes.add(projectCode);

        if (rowErrors.length) {
          rowIssues.push(`Row ${rowNumber}: ${rowErrors.join("; ")}.`);
          return;
        }

        validProjects.push({
          rowNumber,
          subjectCode,
          projectCode,
          title,
          description,
          problemStatement,
          objectives: get(cells, "objectives"),
          difficulty: (difficultyValue.charAt(0).toUpperCase() + difficultyValue.slice(1)) as ParsedProject["difficulty"],
          functionalRequirements,
          technologies,
          status: statusValue as ParsedProject["status"],
        });
      });

      setProjects(validProjects);
      setIssues(rowIssues);
      if (!validProjects.length && !rowIssues.length) setError("The CSV contains no project rows.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read the CSV file.");
    }
  }

  async function importProjects() {
    setError("");
    setNotice("");
    if (!isSupabaseConfigured) {
      setError("Configure Supabase before importing projects.");
      return;
    }
    if (!projects.length || issues.length) {
      setError("Fix all CSV validation issues before importing.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Sign in is required.");

      const subjectCodes = [...new Set(projects.map((project) => project.subjectCode))];
      const { data: subjects, error: subjectsError } = await supabase
        .from("subjects")
        .select("id,subject_code")
        .in("subject_code", subjectCodes);
      if (subjectsError) throw subjectsError;
      const subjectIds = new Map((subjects ?? []).map((subject) => [subject.subject_code.toUpperCase(), subject.id]));
      const missingSubjects = [...new Set(projects.filter((project) => !subjectIds.has(project.subjectCode)).map((project) => project.subjectCode))];
      if (missingSubjects.length) {
        throw new Error(`These subjects are unavailable to your account: ${missingSubjects.join(", ")}. Check the subject codes and your faculty assignments.`);
      }

      const records = projects.map((project) => ({
        subject_id: subjectIds.get(project.subjectCode)!,
        project_code: project.projectCode,
        title: project.title,
        description: project.description,
        problem_statement: project.problemStatement,
        objectives: project.objectives,
        requirements: {
          functional_requirements: project.functionalRequirements,
          development_guidelines: "Complete the work within 10 days. Track daily checklist progress.",
          submission_guidelines: "Submit HTTPS Vercel deployment and GitHub repository URLs.",
        },
        technologies: project.technologies,
        difficulty: project.difficulty,
        status: project.status,
        created_by: user.id,
      }));

      const { error: insertError } = await supabase.from("projects").insert(records);
      if (insertError) throw insertError;
      setNotice(`Successfully imported ${records.length} project${records.length === 1 ? "" : "s"}.`);
      setProjects([]);
      setIssues([]);
      setFileName("");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Project import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell
      role={role}
      title="Bulk project import"
      description="Upload a completed ProjectHub CSV template to add multiple projects."
    >
      <div className="mb-5">
        <Link href={projectsPath} className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700">
          <ArrowLeft size={15}/> Back to projects
        </Link>
      </div>
      <div className="max-w-5xl space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-900">1. Download the template</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Fill one project per row. Keep the column headers unchanged.</p>
            </div>
            <button type="button" onClick={downloadTemplate} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <Download size={15}/> Download CSV template
            </button>
          </div>
          <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 text-xs leading-5 text-slate-600 sm:grid-cols-2">
            <p><strong>Required:</strong> subject_code, project_code, title, description, problem_statement, difficulty, functional_requirements.</p>
            <p><strong>Optional:</strong> objectives, technologies, status. Status defaults to DRAFT. Use Easy/Medium/Hard and DRAFT/PUBLISHED.</p>
            <p>Separate multiple requirements and technologies with <code className="rounded bg-white px-1 py-0.5">|</code>.</p>
            <p>Quote CSV values containing commas. Maximum 200 projects per file, 1 MB per upload.</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileSpreadsheet size={18}/></span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">2. Upload and review</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">We validate each row before anything is saved.</p>
            </div>
          </div>
          <label className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
            <Upload size={20} className="text-slate-400"/>
            <span className="mt-2 text-xs font-bold text-slate-700">{fileName || "Choose a CSV file"}</span>
            <span className="mt-1 text-[11px] text-slate-500">.csv format, up to 1 MB</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => {const file=event.target.files?.[0];event.target.value="";void loadFile(file);}}/>
          </label>

          {issues.length > 0 && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-bold text-amber-900">{issues.length} row{issues.length === 1 ? "" : "s"} need attention</p>
              <ul className="mt-2 max-h-40 list-inside list-disc space-y-1 overflow-auto text-xs text-amber-800">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
              <p className="mt-2 text-[11px] text-amber-800">Correct the CSV and upload it again. Imports are blocked until every row is valid.</p>
            </div>
          )}

          {projects.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold text-slate-800">Preview · {projects.length} valid project{projects.length === 1 ? "" : "s"}</p>
                <p className="text-[11px] text-slate-500">No changes saved yet</p>
              </div>
              <div className="max-h-72 overflow-auto">
                <table className="w-full min-w-[650px] text-left text-xs">
                  <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-2">Row</th><th className="px-4 py-2">Project code</th><th className="px-4 py-2">Title</th><th className="px-4 py-2">Subject code</th><th className="px-4 py-2">Level / status</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{projects.map((project) => <tr key={project.rowNumber}><td className="px-4 py-3 text-slate-400">{project.rowNumber}</td><td className="px-4 py-3 font-semibold text-slate-700">{project.projectCode}</td><td className="px-4 py-3 text-slate-700">{project.title}</td><td className="px-4 py-3 text-slate-600">{project.subjectCode}</td><td className="px-4 py-3 text-slate-600">{project.difficulty} · {project.status}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {!isSupabaseConfigured && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Supabase configuration is required to save projects.</p>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-xs text-green-700">{notice}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">Saving uses your account role and database permissions.</p>
            <button type="button" onClick={() => void importProjects()} disabled={busy || projects.length === 0 || issues.length > 0 || !isSupabaseConfigured} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Importing projects…" : `Import ${projects.length || ""} project${projects.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
