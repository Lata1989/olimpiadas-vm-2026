import { timingSafeEqual } from "node:crypto";
import type { AnyBulkWriteOperation } from "mongodb";
import { isCompetitionLevel } from "@/lib/competition";
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

function isAuthorized(request: Request): boolean {
  const configuredToken = process.env.CHALLENGE_ADMIN_TOKEN;
  if (!configuredToken || configuredToken.length < 32) return false;

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;

  const providedToken = authorization.slice("Bearer ".length);
  const expected = Buffer.from(configuredToken);
  const provided = Buffer.from(providedToken);
  return (
    expected.length === provided.length &&
    timingSafeEqual(expected, provided)
  );
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
    const expectedPdfUrl =
      typeof challengeNumber === "number"
        ? `/challenges/${level.toLowerCase()}-${challengeNumber}.pdf`
        : "";

    if (
      typeof challengeNumber !== "number" ||
      !Number.isInteger(challengeNumber) ||
      challengeNumber < 1 ||
      challengeNumber > 6
    ) {
      throw new Error(`El desafío ${index + 1} debe tener un número entero entre 1 y 6.`);
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
    if (numbers.some((number, index) => number !== index + 1)) {
      throw new Error(
        `Los desafíos ${level} deben enviarse consecutivamente desde el número 1.`,
      );
    }
  }

  return challenges;
}

export async function POST(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    const tokenConfigured =
      typeof process.env.CHALLENGE_ADMIN_TOKEN === "string" &&
      process.env.CHALLENGE_ADMIN_TOKEN.length >= 32;
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
