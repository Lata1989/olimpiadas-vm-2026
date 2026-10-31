import { TOTAL_CHALLENGES } from "@/lib/competition";
import {
  getChallengeCollection,
  getTeamCollection,
  type ChallengeDocument,
  type TeamDocument,
} from "@/lib/mongodb";

type CompetitionLevel = TeamDocument["level"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function challengeConfigurationError(): Response {
  return Response.json(
    { message: "Los desafíos de este nivel todavía no están configurados." },
    { status: 503 },
  );
}

function isValidChallenge(
  challenge: ChallengeDocument | null,
  level: CompetitionLevel,
  challengeNumber: number,
): challenge is ChallengeDocument {
  return (
    challenge !== null &&
    challenge.level === level &&
    challenge.challengeNumber === challengeNumber &&
    typeof challenge.pdfUrl === "string" &&
    challenge.pdfUrl.trim().length > 0 &&
    typeof challenge.answer === "string" &&
    challenge.answer.trim().length > 0
  );
}

function isValidTeamId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 100;
}

export async function GET(request: Request): Promise<Response> {
  const teamId = new URL(request.url).searchParams.get("teamId");
  if (!isValidTeamId(teamId)) {
    return Response.json({ message: "Se requiere un identificador de equipo válido." }, { status: 400 });
  }

  try {
    const teams = await getTeamCollection();
    const team = await teams.findOne({ teamId });
    if (!team) {
      return Response.json({ message: "No se encontró el equipo." }, { status: 404 });
    }

    const challenges = await getChallengeCollection();
    const totalChallenges = await challenges.countDocuments({
      level: team.level,
      challengeNumber: { $gte: 1, $lte: TOTAL_CHALLENGES },
    });
    if (totalChallenges !== TOTAL_CHALLENGES) return challengeConfigurationError();

    if (!team.isFinished) {
      const challenge = await challenges.findOne({
        level: team.level,
        challengeNumber: team.currentChallenge,
      });
      if (!isValidChallenge(challenge, team.level, team.currentChallenge)) {
        return challengeConfigurationError();
      }

      return Response.json({
        teamName: team.teamName,
        level: team.level,
        challengeNumber: team.currentChallenge,
        totalChallenges,
        startTime: team.startTime,
        finishTime: null,
        totalDurationMs: null,
        pdfUrl: challenge.pdfUrl,
        isFinished: false,
        splitTimes: team.splitTimes,
      });
    }

    return Response.json({
      teamName: team.teamName,
      level: team.level,
      challengeNumber: totalChallenges,
      totalChallenges,
      startTime: team.startTime,
      finishTime: team.finishTime ?? null,
      totalDurationMs: team.totalDurationMs ?? null,
      pdfUrl: null,
      isFinished: true,
      splitTimes: team.splitTimes,
    });
  } catch (error: unknown) {
    console.error("No se pudo cargar el desafío.", error);
    return Response.json(
      { message: "No se pudo cargar el desafío. Revisá la conexión con la base de datos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "El cuerpo de la solicitud no es JSON válido." }, { status: 400 });
  }
  if (!isRecord(body) || !isValidTeamId(body.teamId)) {
    return Response.json({ message: "Se requiere un identificador de equipo válido." }, { status: 400 });
  }
  if (
    typeof body.answer !== "string" ||
    body.answer.trim().length === 0 ||
    body.answer.trim().length > 120
  ) {
    return Response.json({ message: "Ingresá una respuesta de hasta 120 caracteres." }, { status: 400 });
  }

  try {
    const teams = await getTeamCollection();
    const team = await teams.findOne({ teamId: body.teamId });
    if (!team) {
      return Response.json({ message: "No se encontró el equipo." }, { status: 404 });
    }
    if (team.isFinished) {
      return Response.json({ message: "Este equipo ya completó la competencia." }, { status: 409 });
    }

    const challenges = await getChallengeCollection();
    const totalChallenges = await challenges.countDocuments({
      level: team.level,
      challengeNumber: { $gte: 1, $lte: TOTAL_CHALLENGES },
    });
    if (totalChallenges !== TOTAL_CHALLENGES) return challengeConfigurationError();
    const challenge = await challenges.findOne({
      level: team.level,
      challengeNumber: team.currentChallenge,
    });
    if (!isValidChallenge(challenge, team.level, team.currentChallenge)) {
      return challengeConfigurationError();
    }

    if (
      body.answer.trim().toLocaleLowerCase("es") !==
      challenge.answer.trim().toLocaleLowerCase("es")
    ) {
      return Response.json({
        correct: false,
        message: "Esa no es la respuesta. Revisen el algoritmo e intenten otra vez.",
      });
    }

    const now = new Date();
    const elapsedMs = Math.max(0, now.getTime() - team.challengeStartedAt.getTime());
    const isLastChallenge = team.currentChallenge >= TOTAL_CHALLENGES;
    const update = await teams.updateOne(
      {
        teamId: team.teamId,
        currentChallenge: team.currentChallenge,
        isFinished: false,
        challengeStartedAt: team.challengeStartedAt,
      },
      {
        $set: isLastChallenge
          ? {
              isFinished: true,
              finishTime: now,
              totalDurationMs: Math.max(0, now.getTime() - team.startTime.getTime()),
              splitTimes: [
                ...team.splitTimes,
                { challengeNumber: team.currentChallenge, elapsedMs },
              ],
            }
          : {
              currentChallenge: team.currentChallenge + 1,
              challengeStartedAt: now,
              splitTimes: [
                ...team.splitTimes,
                { challengeNumber: team.currentChallenge, elapsedMs },
              ],
            },
      },
    );

    if (update.modifiedCount !== 1) {
      return Response.json(
        { message: "El estado del equipo cambió. Actualizá el desafío e intentá de nuevo." },
        { status: 409 },
      );
    }

    return Response.json({ correct: true });
  } catch (error: unknown) {
    console.error("No se pudo enviar la respuesta del desafío.", error);
    return Response.json(
      { message: "No se pudo enviar la respuesta. Revisá la conexión con la base de datos." },
      { status: 500 },
    );
  }
}
