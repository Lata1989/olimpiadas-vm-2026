"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowDownToLine, ArrowRight, LoaderCircle, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
  const [unavailableLogos, setUnavailableLogos] = useState<string[]>([]);

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
    <main className="flex flex-1 items-center px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
        <section className="max-w-xl">
          <div className="mb-12 flex h-16 items-center gap-10">
            {[
              { src: "/logos/logo-1.png", alt: "Primer logo" },
              { src: "/logos/logo-2.png", alt: "Segundo logo" },
            ].map((logo) =>
              unavailableLogos.includes(logo.src) ? (
                <span
                  key={logo.src}
                  className="text-xs text-muted-foreground/60"
                  aria-label={`${logo.alt}: agregá ${logo.src}`}
                >
                  {logo.alt}
                </span>
              ) : (
                <Image
                  key={logo.src}
                  src={logo.src}
                  alt={logo.alt}
                  width={144}
                  height={64}
                  className="max-h-16 w-36 object-contain object-left"
                  onError={() =>
                    setUnavailableLogos((current) => [...current, logo.src])
                  }
                />
              ),
            )}
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-balance sm:text-5xl lg:text-6xl">
            Olimpiadas de
            <br />
            <span className="text-primary">Programación</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Competencia de programación por equipos. Elegí el nivel e inscribí a tu equipo.
          </p>
        </section>

        <section className="mx-auto w-full max-w-lg border-t border-border/70 pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
          <header className="mb-7">
            <h2 className="text-xl font-medium tracking-tight">Inscripción de equipo</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Para retomar, ingresá los mismos datos del equipo.
            </p>
          </header>
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
              <p className="text-sm text-destructive" role="alert">
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
          </form>
        </section>
      </div>
    </main>
  );
}
