"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  Code2,
  LoaderCircle,
  Plus,
  Users,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getErrorMessage,
  getChallengePdfUrl,
  parseRegistrationResponse,
  requestApi,
  TEAM_ID_STORAGE_KEY,
  type CompetitionLevel,
} from "@/lib/competition";

export default function Home() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [level, setLevel] = useState<CompetitionLevel>("Junior");
  const [members, setMembers] = useState([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateMember(index: number, value: string) {
    setMembers((currentMembers) =>
      currentMembers.map((member, memberIndex) =>
        memberIndex === index ? value : member,
      ),
    );
  }

  function addMember() {
    setMembers((currentMembers) =>
      currentMembers.length < 3 ? [...currentMembers, ""] : currentMembers,
    );
  }

  function removeMember(index: number) {
    setMembers((currentMembers) =>
      currentMembers.length > 1
        ? currentMembers.filter((_, memberIndex) => memberIndex !== index)
        : currentMembers,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!teamName.trim()) {
      setError("Ingresá un nombre para el equipo.");
      return;
    }

    const cleanMembers = members.map((member) => member.trim());
    if (cleanMembers.some((member) => member.length === 0)) {
      setError("Completá el nombre de cada integrante.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await requestApi("/api/register", {
        method: "POST",
        body: JSON.stringify({
          teamName: teamName.trim(),
          level,
          members: cleanMembers,
        }),
      });
      const { teamId } = parseRegistrationResponse(response);
      window.localStorage.setItem(TEAM_ID_STORAGE_KEY, teamId);
      router.push("/dashboard");
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError, "No pudimos registrar el equipo. Intentá de nuevo."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex flex-1 items-center px-5 py-12 sm:px-8 lg:py-16">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
        <section className="max-w-xl">
          <Badge variant="outline" className="mb-6 gap-2 border-primary/25 bg-primary/5 px-3 py-1 text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            INSCRIPCIÓN ABIERTA
          </Badge>
          <h1 className="text-4xl font-semibold tracking-[-0.055em] text-balance sm:text-5xl lg:text-6xl">
            Pensá en equipo.
            <br />
            <span className="text-muted-foreground">Programá sin límites.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            Una competencia, cuatro desafíos y una sola meta: resolverlos juntos.
            Registrá a tu equipo para empezar.
          </p>

          <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
            <Card size="sm" className="bg-card/60">
              <CardContent className="flex items-center gap-3 pt-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-primary">
                  <Users aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">Hasta 3 personas</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Un mismo equipo</p>
                </div>
              </CardContent>
            </Card>
            <Card size="sm" className="bg-card/60">
              <CardContent className="flex items-center gap-3 pt-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-primary">
                  <Code2 aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">4 desafíos</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">De lógica y código</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-lg border-border/80 bg-card/90 shadow-2xl shadow-black/20">
          <CardHeader className="gap-2 border-b border-border/70 px-6 py-6 sm:px-8">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl tracking-tight">Crear o retomar equipo</CardTitle>
              <span className="font-mono text-xs text-muted-foreground">01 / 03</span>
            </div>
            <CardDescription>
              Si ya empezaron, ingresen el mismo nombre, nivel e integrantes para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="team-name">Nombre del equipo</Label>
                <Input
                  id="team-name"
                  name="teamName"
                  placeholder="Ej. Los algoritmos"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  maxLength={60}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-level">Nivel</Label>
                <Select value={level} onValueChange={(value) => {
                  if (value === "Junior" || value === "Senior") setLevel(value);
                }}>
                  <SelectTrigger id="team-level" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
                <a
                  href={getChallengePdfUrl(level)}
                  download
                  className={`${buttonVariants({ variant: "outline", size: "sm" })} h-9 gap-2`}
                >
                  <ArrowDownToLine aria-hidden="true" />
                  Descargar todos los problemas
                </a>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Integrantes</Label>
                  <span className="text-xs text-muted-foreground">
                    {members.length} de 3
                  </span>
                </div>
                <div className="space-y-3">
                  {members.map((member, index) => (
                    <div className="flex items-center gap-2" key={index}>
                      <Input
                        aria-label={`Nombre del integrante ${index + 1}`}
                        name={`member-${index + 1}`}
                        placeholder={`Integrante ${index + 1}`}
                        value={member}
                        onChange={(event) => updateMember(index, event.target.value)}
                        maxLength={60}
                        required
                      />
                      {members.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label={`Quitar integrante ${index + 1}`}
                          onClick={() => removeMember(index)}
                        >
                          <span aria-hidden="true">−</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {members.length < 3 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-1.5 text-muted-foreground hover:text-foreground"
                    onClick={addMember}
                  >
                    <Plus aria-hidden="true" />
                    Agregar integrante
                  </Button>
                )}
              </div>

              {error && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="h-11 w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                    Registrando equipo
                  </>
                ) : (
                  <>
                    Empezar competencia
                    <ArrowRight aria-hidden="true" />
                  </>
                )}
              </Button>
              <p className="text-center text-xs leading-5 text-muted-foreground">
                Al continuar, cada integrante queda asociado a este equipo.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
