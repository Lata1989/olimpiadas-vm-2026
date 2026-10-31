"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Clock3, LoaderCircle, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  formatDuration,
  getErrorMessage,
  parseAdminTeams,
  requestApi,
  type AdminTeamEntry,
  type CompetitionLevel,
} from "@/lib/competition";

function timestampInMilliseconds(value: string | number): number {
  return typeof value === "number" ? value : Date.parse(value);
}

function formatDateTime(value: string | number): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(timestampInMilliseconds(value)));
}

function elapsedSince(start: string | number, now: number): number {
  return Math.max(0, now - timestampInMilliseconds(start));
}

export default function AdminPage() {
  const [tokenInput, setTokenInput] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [teams, setTeams] = useState<AdminTeamEntry[]>([]);
  const [now, setNow] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadTeams = useCallback(async (token: string) => {
    const response = await requestApi("/api/admin/teams", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const loadedTeams = parseAdminTeams(response);
    setTeams(loadedTeams);
    setError("");
  }, []);

  useEffect(() => {
    if (!adminToken) return;

    const clockInterval = window.setInterval(() => setNow(Date.now()), 1000);
    const refreshInterval = window.setInterval(() => {
      void loadTeams(adminToken).catch((loadError: unknown) => {
        setError(
          getErrorMessage(loadError, "No se pudo actualizar el panel de equipos."),
        );
      });
    }, 15000);

    return () => {
      window.clearInterval(clockInterval);
      window.clearInterval(refreshInterval);
    };
  }, [adminToken, loadTeams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = tokenInput.trim();
    if (!token) {
      setError("Ingresá el token de administración.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      await loadTeams(token);
      setAdminToken(token);
      setTokenInput("");
      setNow(Date.now());
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "No se pudo validar el acceso."));
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshTeams() {
    setIsRefreshing(true);
    try {
      await loadTeams(adminToken);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "No se pudo actualizar el panel de equipos."));
    } finally {
      setIsRefreshing(false);
    }
  }

  function closeSession() {
    setAdminToken("");
    setTeams([]);
    setError("");
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-wide text-muted-foreground">
            VM / 2026
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Seguimiento de equipos
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Progreso y tiempos de todos los equipos, agrupados por nivel.
          </p>
        </div>
        {adminToken && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={refreshTeams}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <RefreshCw aria-hidden="true" />
              )}
              Actualizar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 gap-2"
              onClick={closeSession}
            >
              <LogOut aria-hidden="true" />
              Cerrar sesión
            </Button>
          </div>
        )}
      </div>

      {!adminToken ? (
        <Card className="mx-auto w-full max-w-lg border-border/80">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <CardTitle>Acceso de administración</CardTitle>
            <CardDescription>
              Ingresá el token configurado en el servidor para consultar el avance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="admin-token">Token</Label>
                <Input
                  id="admin-token"
                  name="token"
                  type="password"
                  autoComplete="current-password"
                  value={tokenInput}
                  onChange={(event) => setTokenInput(event.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                    Verificando acceso
                  </>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          {error && (
            <p
              className="mb-5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
          {isRefreshing && teams.length === 0 ? (
            <div className="space-y-6">
              <Skeleton className="h-72 w-full rounded-xl" />
              <Skeleton className="h-72 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-6">
              {COMPETITION_LEVELS.map((level) => {
                const levelTeams = teams.filter((team) => team.level === level);
                return (
                  <LevelTeamsCard
                    key={level}
                    level={level}
                    teams={levelTeams}
                    now={now}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function LevelTeamsCard({
  level,
  teams,
  now,
}: {
  level: CompetitionLevel;
  teams: AdminTeamEntry[];
  now: number;
}) {
  return (
    <Card className="overflow-hidden border-border/80">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-5 sm:px-7">
        <div>
          <CardTitle className="text-lg tracking-tight">Nivel {level}</CardTitle>
          <CardDescription className="mt-1">
            Avance y tiempos registrados para cada equipo.
          </CardDescription>
        </div>
        <Badge variant="secondary" className="font-mono text-xs">
          {teams.length} {teams.length === 1 ? "equipo" : "equipos"}
        </Badge>
      </CardHeader>

      {teams.length === 0 ? (
        <CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
          Todavía no hay equipos registrados en este nivel.
        </CardContent>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border/70 hover:bg-transparent">
              <TableHead className="pl-6 text-xs uppercase tracking-wide text-muted-foreground sm:pl-7">
                Equipo
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                Desafío
              </TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                Tiempo del desafío
              </TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                Tiempo total
              </TableHead>
              <TableHead className="pr-6 text-right text-xs uppercase tracking-wide text-muted-foreground sm:pr-7">
                Inicio / finalización
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => {
              const finishTime = team.finishTime;
              const totalElapsed = finishTime
                ? team.totalDurationMs ??
                  timestampInMilliseconds(finishTime) -
                    timestampInMilliseconds(team.startTime)
                : elapsedSince(team.startTime, now);
              const challengeElapsed = team.isFinished
                ? null
                : elapsedSince(team.challengeStartedAt, now);

              return (
                <TableRow
                  key={`${team.teamName}-${timestampInMilliseconds(team.startTime)}`}
                  className="border-border/60"
                >
                  <TableCell className="pl-6 sm:pl-7">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{team.teamName}</span>
                      <Badge
                        variant={team.isFinished ? "outline" : "secondary"}
                        className="w-fit text-[10px]"
                      >
                        {team.isFinished ? "FINALIZADO" : "EN CURSO"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {team.isFinished
                      ? `${team.totalChallenges} de ${team.totalChallenges} completados`
                      : `Desafío ${team.currentChallenge} de ${team.totalChallenges}`}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {challengeElapsed === null ? (
                        "—"
                      ) : (
                        <>
                          <Clock3
                            aria-hidden="true"
                            className="size-3.5 text-muted-foreground"
                          />
                          {formatDuration(challengeElapsed)}
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">
                    {formatDuration(totalElapsed)}
                  </TableCell>
                  <TableCell className="pr-6 text-right text-xs text-muted-foreground sm:pr-7">
                    <span className="flex flex-col gap-1">
                      <span>{formatDateTime(team.startTime)}</span>
                      <span className="text-muted-foreground">
                        {finishTime ? formatDateTime(finishTime) : "En curso"}
                      </span>
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
