import type { AnyBulkWriteOperation } from "mongodb";
import {
  getChallengePdfUrl,
  isCompetitionLevel,
  TOTAL_CHALLENGES,
} from "@/lib/competition";
import { isAdminAuthorized, isAdminTokenConfigured } from "@/lib/admin-auth";
import {
  getChallengeCollection,
  type ChallengeDocument,
} from "@/lib/mongodb";

interface ChallengeInput {
  level: "Junior" | "Senior";
  challengeNumber: number;
  pdfUrl: string;
  answer: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseChallenges(value: unknown): ChallengeInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("El campo challenges debe ser una lista no vacía.");
  }

  const challenges = value.map((item: unknown, index: number): ChallengeInput => {
    if (!isRecord(item) || !isCompetitionLevel(item.level)) {
      throw new Error(`El desafío ${index + 1} debe tener un nivel Junior o Senior.`);
    }

    const { level } = item;
    const challengeNumber = item.challengeNumber;
    const expectedPdfUrl = getChallengePdfUrl(level);

    if (
      typeof challengeNumber !== "number" ||
      !Number.isInteger(challengeNumber) ||
      challengeNumber < 1 ||
      challengeNumber > TOTAL_CHALLENGES
    ) {
      throw new Error(
        `El desafío ${index + 1} debe tener un número entero entre 1 y ${TOTAL_CHALLENGES}.`,
      );
    }
    if (item.pdfUrl !== expectedPdfUrl) {
      throw new Error(
        `El desafío ${level} ${challengeNumber} debe usar el PDF ${expectedPdfUrl}.`,
      );
    }
    if (typeof item.answer !== "string" || item.answer.trim().length === 0) {
      throw new Error(`Falta la respuesta del desafío ${level} ${challengeNumber}.`);
    }
    if (item.answer.trim().length > 120) {
      throw new Error(`La respuesta del desafío ${level} ${challengeNumber} supera los 120 caracteres.`);
    }

    return {
      level,
      challengeNumber,
      pdfUrl: expectedPdfUrl,
      answer: item.answer.trim(),
    };
  });

  const seen = new Set<string>();
  for (const challenge of challenges) {
    const key = `${challenge.level}-${challenge.challengeNumber}`;
    if (seen.has(key)) {
      throw new Error(`El desafío ${key} aparece más de una vez.`);
    }
    seen.add(key);
  }

  for (const level of ["Junior", "Senior"] as const) {
    const numbers = challenges
      .filter((challenge) => challenge.level === level)
      .map((challenge) => challenge.challengeNumber)
      .sort((first, second) => first - second);
    if (
      numbers.length > 0 &&
      (numbers.length !== TOTAL_CHALLENGES ||
        numbers.some((number, index) => number !== index + 1))
    ) {
      throw new Error(
        `Los ${TOTAL_CHALLENGES} desafíos ${level} deben enviarse consecutivamente desde el número 1.`,
      );
    }
  }

  return challenges;
}

export async function POST(request: Request): Promise<Response> {
  if (!isAdminAuthorized(request)) {
    const tokenConfigured = isAdminTokenConfigured();
    return Response.json(
      {
        message: tokenConfigured
          ? "Token de administración inválido."
          : "Configurá CHALLENGE_ADMIN_TOKEN con al menos 32 caracteres.",
      },
      { status: tokenConfigured ? 401 : 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { message: "El cuerpo de la solicitud no es JSON válido." },
      { status: 400 },
    );
  }
  if (!isRecord(body)) {
    return Response.json(
      { message: "El cuerpo debe ser un objeto JSON con la propiedad challenges." },
      { status: 400 },
    );
  }

  let challenges: ChallengeInput[];
  try {
    challenges = parseChallenges(body.challenges);
  } catch (error: unknown) {
    return Response.json(
      {
        message:
          error instanceof Error ? error.message : "Los desafíos enviados son inválidos.",
      },
      { status: 400 },
    );
  }

  try {
    const collection = await getChallengeCollection();
    const operations: AnyBulkWriteOperation<ChallengeDocument>[] = challenges.map(
      (challenge) => ({
        updateOne: {
          filter: {
            level: challenge.level,
            challengeNumber: challenge.challengeNumber,
          },
          update: { $set: challenge },
          upsert: true,
        },
      }),
    );
    const result = await collection.bulkWrite(operations, { ordered: true });

    return Response.json({
      message: "Desafíos guardados correctamente.",
      received: challenges.length,
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
    });
  } catch (error: unknown) {
    console.error("No se pudieron guardar los desafíos.", error);
    return Response.json(
      { message: "No se pudieron guardar los desafíos en la base de datos." },
      { status: 500 },
    );
  }
}
