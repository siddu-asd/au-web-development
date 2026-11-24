import { Blocks } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
        <Blocks size={21} strokeWidth={2.4} />
      </div>
      {!compact && (
        <div>
          <div className="text-[17px] font-bold leading-5 tracking-tight text-slate-950">
            ProjectHub
          </div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Academic workspace
          </div>
        </div>
      )}
    </div>
  );
}
