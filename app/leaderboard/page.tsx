"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  COMPETITION_LEVELS,
  ADMIN_TOKEN_SESSION_KEY,
  formatDuration,
  getErrorMessage,
  parseLeaderboard,
  requestApi,
  type CompetitionLevel,
  type LeaderboardEntry,
} from "@/lib/competition";

export default function LeaderboardPage() {
  const [level, setLevel] = useState<CompetitionLevel>("Junior");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminToken, setAdminToken] = useState("");
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [error, setError] = useState("");

  const loadEntries = useCallback(async (token: string) => {
    try {
      const results = await Promise.all(
        COMPETITION_LEVELS.map(async (competitionLevel) => {
          const query = new URLSearchParams({ level: competitionLevel });
          const response = await requestApi(
            `/api/leaderboard?${query.toString()}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          return parseLeaderboard(response);
        }),
      );
      setEntries(results.flat().sort((first, second) => first.durationMs - second.durationMs));
      setError("");
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "No pudimos cargar la tabla de posiciones."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const token = window.sessionStorage.getItem(ADMIN_TOKEN_SESSION_KEY) ?? "";
      setAdminToken(token);
      setIsSessionReady(true);
      if (token) void loadEntries(token);
      else setIsLoading(false);
    });
  }, [loadEntries]);

  function refreshEntries() {
    setIsLoading(true);
    setError("");
    void loadEntries(adminToken);
  }

  const visibleEntries = useMemo(
    () => entries.filter((entry) => entry.level === level),
    [entries, level],
  );

  if (!isSessionReady) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 px-5 py-12 sm:px-8">
        <div className="w-full space-y-4">
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </main>
    );
  }

  if (!adminToken) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-5 py-12 sm:px-8">
        <Card className="mx-auto w-full max-w-lg border-border/80">
          <CardHeader>
            <CardTitle>Tabla de posiciones privada</CardTitle>
            <CardDescription>
              Ingresá primero al panel de administración para consultar esta tabla.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" render={<Link href="/admin" />}>
              Ir a administración
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Tabla de posiciones
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Los equipos finalistas, ordenados por tiempo total.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          onClick={refreshEntries}
          disabled={isLoading}
        >
          {isLoading ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          Actualizar
        </Button>
      </div>

      <Card className="overflow-hidden border-border/80">
        <CardHeader className="border-b border-border/70 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg tracking-tight">Equipos finalistas</CardTitle>
              <CardDescription className="mt-1">
                Menor tiempo total obtiene la mejor posición.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              {isLoading ? "…" : `${visibleEntries.length} ${visibleEntries.length === 1 ? "equipo" : "equipos"}`}
            </Badge>
          </div>

          <div className="mt-5 flex w-fit gap-5 border-b border-border">
            {COMPETITION_LEVELS.map((competitionLevel) => {
              const selected = level === competitionLevel;
              return (
                <button
                  key={competitionLevel}
                  type="button"
                  onClick={() => setLevel(competitionLevel)}
                  aria-pressed={selected}
                  className={`h-9 border-b-2 px-1 text-sm transition-colors ${
                    selected
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {competitionLevel}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm text-destructive" role="alert">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={refreshEntries}>
                Intentar de nuevo
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-4 px-6 py-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <h2 className="text-sm font-medium">Todavía no hay equipos finalistas</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Cuando un equipo de nivel {level} complete todos los desafíos, aparecerá en esta lista.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/70 hover:bg-transparent">
                  <TableHead className="w-20 pl-6 text-xs uppercase tracking-wide text-muted-foreground sm:pl-7">
                    Puesto
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                    Equipo
                  </TableHead>
                  <TableHead className="pr-6 text-right text-xs uppercase tracking-wide text-muted-foreground sm:pr-7">
                    Tiempo total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntries.map((entry, index) => (
                  <TableRow key={`${entry.teamName}-${entry.startTime}`} className="border-border/60">
                    <TableCell className="pl-6 sm:pl-7">
                      <span className={`inline-flex size-7 items-center justify-center rounded-md font-mono text-xs ${
                        index === 0
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-muted-foreground"
                      }`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{entry.teamName}</span>
                      {index === 0 && (
                        <Badge variant="outline" className="ml-2 border-primary/25 px-1.5 py-0 text-[10px] text-primary">
                          PRIMERO
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right font-mono text-sm tabular-nums sm:pr-7">
                      <span className="inline-flex items-center justify-end gap-2">
                        {index === 0 && <ArrowDown aria-hidden="true" className="size-3.5 text-primary" />}
                        {formatDuration(entry.durationMs)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-right text-xs text-muted-foreground">
        El tiempo se calcula desde el inicio hasta la finalización de la competencia.
      </p>
    </main>
  );
}
