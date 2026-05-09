import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-700 bg-slate-800 p-6",
        className
      )}
    >
      {children}
    </div>
  );
}