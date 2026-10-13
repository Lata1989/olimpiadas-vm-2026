import { createHash, randomUUID } from "node:crypto";
import { isCompetitionLevel } from "@/lib/competition";
import { getTeamCollection } from "@/lib/mongodb";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeIdentityPart(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("es");
}

function createTeamIdentityKey(
  teamName: string,
  level: "Junior" | "Senior",
  members: string[],
): string {
  const identity = JSON.stringify({
    teamName: normalizeIdentityPart(teamName),
    level,
    members: members.map(normalizeIdentityPart).sort(),
  });
  return createHash("sha256").update(identity).digest("hex");
}

function hasMongoErrorCode(error: unknown, code: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ message: "Los datos del equipo son inválidos." }, { status: 400 });
  }

  const teamName =
    typeof body.teamName === "string" ? body.teamName.trim() : "";
  const level = body.level;
  const members = Array.isArray(body.members)
    ? body.members.map((member: unknown) =>
        typeof member === "string" ? member.trim() : "",
      )
    : [];

  if (teamName.length < 1 || teamName.length > 60) {
    return Response.json(
      { message: "El nombre del equipo debe tener entre 1 y 60 caracteres." },
      { status: 400 },
    );
  }
  if (!isCompetitionLevel(level)) {
    return Response.json({ message: "El nivel debe ser Junior o Senior." }, { status: 400 });
  }
  if (
    members.length < 1 ||
    members.length > 3 ||
    members.some((member: string) => member.length < 1 || member.length > 60)
  ) {
    return Response.json(
      { message: "El equipo debe incluir entre 1 y 3 integrantes con nombres válidos." },
      { status: 400 },
    );
  }

  try {
    const teams = await getTeamCollection();
    await teams.createIndex(
      { teamIdentityKey: 1 },
      {
        unique: true,
        partialFilterExpression: { teamIdentityKey: { $type: "string" } },
      },
    );

    const teamIdentityKey = createTeamIdentityKey(teamName, level, members);
    const existingTeam = await teams.findOne({ teamIdentityKey });
    if (existingTeam) {
      return Response.json({ teamId: existingTeam.teamId, resumed: true });
    }

    const normalizedMembers = members.map(normalizeIdentityPart).sort();
    const possibleExistingTeams = await teams
      .find({ level, teamName })
      .collation({ locale: "es", strength: 2 })
      .toArray();
    const legacyTeam = possibleExistingTeams.find((team) => {
      const existingMembers = team.members.map(normalizeIdentityPart).sort();
      return (
        existingMembers.length === normalizedMembers.length &&
        existingMembers.every(
          (member, index) => member === normalizedMembers[index],
        )
      );
    });

    if (legacyTeam) {
      await teams.updateOne(
        { teamId: legacyTeam.teamId },
        { $set: { teamIdentityKey } },
      );
      return Response.json({ teamId: legacyTeam.teamId, resumed: true });
    }

    const now = new Date();
    const teamId = randomUUID();
    await teams.insertOne({
      teamId,
      teamName,
      level,
      members,
      teamIdentityKey,
      startTime: now,
      currentChallenge: 1,
      challengeStartedAt: now,
      isFinished: false,
      splitTimes: [],
    });

    return Response.json({ teamId }, { status: 201 });
  } catch (error: unknown) {
    if (hasMongoErrorCode(error, 11000)) {
      try {
        const teams = await getTeamCollection();
        const teamIdentityKey = createTeamIdentityKey(teamName, level, members);
        const existingTeam = await teams.findOne({ teamIdentityKey });
        if (existingTeam) {
          return Response.json({ teamId: existingTeam.teamId, resumed: true });
        }
      } catch (lookupError: unknown) {
        console.error("No se pudo recuperar el equipo existente.", lookupError);
      }
    }
    console.error("No se pudo registrar el equipo.", error);
    return Response.json(
      { message: "No se pudo guardar el equipo. Revisá la conexión con la base de datos." },
      { status: 500 },
    );
  }
}
