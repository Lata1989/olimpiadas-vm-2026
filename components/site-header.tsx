import Link from "next/link";
import { Code2, Trophy } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="relative z-10 border-b border-border/70">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="VM 2026, inicio">
          <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-primary transition-colors group-hover:border-primary/40">
            <Code2 aria-hidden="true" className="size-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight">VM 2026</span>
            <span className="block text-[11px] text-muted-foreground">Olimpiadas de programación</span>
          </span>
        </Link>
        <Link
          href="/leaderboard"
          className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Trophy aria-hidden="true" className="size-4" />
          <span>Posiciones</span>
        </Link>
      </div>
    </header>
  );
}
