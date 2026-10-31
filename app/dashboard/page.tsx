"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCircle2,
  LoaderCircle,
  Timer,
  Trophy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
  formatDuration,
  getErrorMessage,
  parseAnswerSubmissionResult,
  parseChallengeState,
  requestApi,
  TEAM_ID_STORAGE_KEY,
  type ChallengeState,
} from "@/lib/competition";

export default function DashboardPage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadChallenge = useCallback(async (id: string) => {
    try {
      const query = new URLSearchParams({ teamId: id });
      const response = await requestApi(`/api/challenge?${query.toString()}`);
      setChallenge(parseChallengeState(response));
      setError("");
      setNotice("");
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, "No pudimos cargar el desafío. Intentá de nuevo."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedTeamId = window.localStorage.getItem(TEAM_ID_STORAGE_KEY);
    if (!storedTeamId) {
      router.replace("/");
      return;
    }
    void Promise.resolve().then(() => loadChallenge(storedTeamId));
  }, [loadChallenge, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const storedTeamId = window.localStorage.getItem(TEAM_ID_STORAGE_KEY);
    if (!storedTeamId) {
      router.replace("/");
      return;
    }
    if (!answer.trim()) return;

    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await requestApi("/api/challenge", {
        method: "POST",
        body: JSON.stringify({ teamId: storedTeamId, answer: answer.trim() }),
      });
      const result = parseAnswerSubmissionResult(response);
      if (!result.correct) {
        setNotice(result.message || "Esa no es la respuesta. Revisen el algoritmo e intenten otra vez.");
        return;
      }

      setAnswer("");
      setNotice("¡Respuesta correcta! Cargando el próximo desafío…");
      await loadChallenge(storedTeamId);
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, "No pudimos enviar tu respuesta. Intentá de nuevo."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-12 sm:px-8">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-4 h-10 w-72 max-w-full" />
        <Skeleton className="mt-3 h-5 w-56 max-w-full" />
        <Skeleton className="mt-10 h-72 w-full rounded-xl" />
      </main>
    );
  }

  if (error && !challenge) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-5 py-12 sm:px-8">
        <Card className="mx-auto w-full max-w-lg">
          <CardContent className="px-6 py-10 text-center">
            <p className="text-sm text-destructive" role="alert">{error}</p>
            <Button
              className="mt-5"
              variant="outline"
              onClick={() => {
                const storedTeamId = window.localStorage.getItem(TEAM_ID_STORAGE_KEY);
                if (!storedTeamId) {
                  router.replace("/");
                  return;
                }
                setError("");
                setIsLoading(true);
                void loadChallenge(storedTeamId);
              }}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!challenge) return null;

  if (challenge.isFinished) {
    const totalDurationMs =
      challenge.totalDurationMs ??
      (challenge.finishTime === null
        ? 0
        : new Date(challenge.finishTime).getTime() -
          new Date(challenge.startTime).getTime());
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-5 py-12 sm:px-8">
        <Card className="mx-auto w-full max-w-2xl border-primary/20">
          <CardHeader className="items-center px-6 pb-2 pt-10 text-center sm:px-10">
            <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Trophy aria-hidden="true" className="size-7" />
            </span>
            <Badge variant="outline" className="border-primary/30 text-primary">COMPETENCIA COMPLETADA</Badge>
            <CardTitle className="mt-2 text-3xl tracking-tight">¡Felicitaciones, {challenge.teamName}!</CardTitle>
            <CardDescription className="max-w-md">
              Resolvieron todos los desafíos en {formatDuration(totalDurationMs)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8 pt-6 sm:px-10">
            {challenge.splitTimes.length > 0 ? (
              <div className="divide-y divide-border rounded-xl border border-border/80">
                {challenge.splitTimes.map((split) => (
                  <div key={split.challengeNumber} className="flex items-center justify-between px-4 py-3.5">
                    <span className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex size-7 items-center justify-center rounded-md bg-muted text-xs font-medium text-foreground">
                        {String(split.challengeNumber).padStart(2, "0")}
                      </span>
                      Desafío {split.challengeNumber}
                    </span>
                    <span className="font-mono text-sm tabular-nums">{formatDuration(split.elapsedMs)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-border px-4 py-5 text-center text-sm text-muted-foreground">
                No hay tiempos parciales disponibles para mostrar.
              </p>
            )}
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Nivel {challenge.level} · {challenge.splitTimes.length} desafíos completados
            </p>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Inicio: {new Date(challenge.startTime).toLocaleString("es-AR")} · Finalización:{" "}
              {challenge.finishTime === null
                ? "sin registrar"
                : new Date(challenge.finishTime).toLocaleString("es-AR")}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const progress = Math.min(
    100,
    Math.max(0, (challenge.challengeNumber / challenge.totalChallenges) * 100),
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-wide text-muted-foreground">
            {challenge.teamName.toUpperCase()} <span className="px-1.5 text-border">/</span> NIVEL {challenge.level.toUpperCase()}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Tu competencia
          </h1>
        </div>
        <Badge variant="secondary" className="h-7 gap-1.5 px-2.5 font-mono text-xs">
          <span className="size-1.5 rounded-full bg-primary" />
          EN CURSO
        </Badge>
      </div>

      <Card className="overflow-hidden border-border/80">
        <CardHeader className="border-b border-border/70 px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardDescription className="font-mono text-xs uppercase tracking-[0.16em]">
                Desafío actual
              </CardDescription>
              <CardTitle className="mt-2 text-2xl tracking-tight">
                Desafío {challenge.challengeNumber}
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  de {challenge.totalChallenges}
                </span>
              </CardTitle>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
              <Timer aria-hidden="true" className="size-4" />
              <span>Nivel {challenge.level}</span>
            </span>
          </div>
          <div
            className="mt-5 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Progreso de desafíos"
            aria-valuemin={0}
            aria-valuemax={challenge.totalChallenges}
            aria-valuenow={challenge.challengeNumber}
          >
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </CardHeader>

        <CardContent className="grid gap-8 px-6 py-7 sm:px-8 sm:py-9 md:grid-cols-[1fr_0.9fr] md:gap-12">
          <section>
            <h2 className="text-lg font-medium tracking-tight">Consigna</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Descarguen el archivo con todos los problemas de su nivel y trabajen en equipo para encontrar la respuesta.
            </p>
            <a
              href={challenge.pdfUrl ?? undefined}
              download
              target="_blank"
              rel="noreferrer"
              className={`${buttonVariants({ variant: "outline", size: "lg" })} mt-6 h-11 gap-2`}
              aria-label={`Descargar todos los problemas del nivel ${challenge.level}`}
            >
              <ArrowDownToLine aria-hidden="true" />
              Descargar todos los problemas
            </a>
          </section>

          <section className="rounded-xl border border-border/80 bg-background/60 p-5 sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <Check aria-hidden="true" className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-medium">Enviar respuesta</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Ingresá el resultado que obtuvo el algoritmo de tu equipo.
                </p>
              </div>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <Label htmlFor="challenge-answer">Respuesta</Label>
              <Input
                id="challenge-answer"
                name="answer"
                placeholder="Número o texto"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                autoComplete="off"
                maxLength={120}
                required
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">{error}</p>
              )}
              {notice && (
                <p
                  className={`text-sm ${notice.startsWith("¡Respuesta correcta!") ? "text-primary" : "text-muted-foreground"}`}
                  role="status"
                  aria-live="polite"
                >
                  {notice}
                </p>
              )}
              <Button type="submit" className="h-10 w-full" disabled={isSubmitting || isLoading}>
                {isSubmitting ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                    Verificando
                  </>
                ) : (
                  <>
                    Enviar respuesta
                    <ArrowRight aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Podés volver a intentarlo si la respuesta no es correcta.
            </p>
          </section>
        </CardContent>
      </Card>

      <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 aria-hidden="true" className="size-3.5 text-primary/80" />
        <span>El progreso de tu equipo se guarda automáticamente.</span>
      </div>
    </main>
  );
}
