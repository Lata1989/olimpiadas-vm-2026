export const TEAM_ID_STORAGE_KEY = "teamId";

export const COMPETITION_LEVELS = ["Junior", "Senior"] as const;

export type CompetitionLevel = (typeof COMPETITION_LEVELS)[number];

export interface RegistrationPayload {
  teamName: string;
  level: CompetitionLevel;
  members: string[];
}

export interface ChallengeSplit {
  challengeNumber: number;
  elapsedMs: number;
}

export interface ChallengeState {
  teamName: string;
  level: CompetitionLevel;
  challengeNumber: number;
  totalChallenges: number;
  pdfUrl: string | null;
  isFinished: boolean;
  splitTimes: ChallengeSplit[];
}

export interface AnswerSubmissionResult {
  correct: boolean;
  message?: string;
}

export interface LeaderboardEntry {
  teamName: string;
  level: CompetitionLevel;
  startTime: string | number;
  finishTime: string | number;
  durationMs: number;
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`La respuesta de ${context} tiene un formato inválido.`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`La respuesta de la API no incluye ${field}.`);
  }
  return value;
}

function asNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`La respuesta de la API incluye un valor inválido para ${field}.`);
  }
  return value;
}

export function isCompetitionLevel(value: unknown): value is CompetitionLevel {
  return value === "Junior" || value === "Senior";
}

function asTimestamp(value: unknown, field: string): string | number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) return value;
  throw new Error(`La respuesta de la API incluye una fecha inválida para ${field}.`);
}

function timestampToMilliseconds(value: string | number): number {
  return typeof value === "number" ? value : Date.parse(value);
}

export async function requestApi(
  url: string,
  options: RequestInit = {},
): Promise<unknown> {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const responseText = await response.text();
  let payload: unknown = null;
  if (responseText.trim().length > 0) {
    try {
      payload = JSON.parse(responseText) as unknown;
    } catch {
      if (!response.ok) {
        throw new Error(`La solicitud falló (${response.status}).`);
      }
      throw new Error("La API devolvió una respuesta que no es JSON válido.");
    }
  }

  if (!response.ok) {
    const errorBody =
      typeof payload === "object" && payload !== null && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : null;
    const message =
      typeof errorBody?.message === "string"
        ? errorBody.message
        : typeof errorBody?.error === "string"
          ? errorBody.error
          : `La solicitud falló (${response.status}).`;
    throw new Error(message);
  }

  return payload;
}

export function parseRegistrationResponse(payload: unknown): { teamId: string } {
  const response = asRecord(payload, "registro");
  return { teamId: asString(response.teamId, "el identificador del equipo") };
}

export function parseChallengeState(payload: unknown): ChallengeState {
  const response = asRecord(payload, "desafío");
  if (!isCompetitionLevel(response.level)) {
    throw new Error("La respuesta de la API incluye un nivel inválido.");
  }
  if (typeof response.isFinished !== "boolean") {
    throw new Error("La respuesta de la API no incluye el estado de la competencia.");
  }
  if (response.pdfUrl !== null && typeof response.pdfUrl !== "string") {
    throw new Error("La respuesta de la API incluye un enlace de consigna inválido.");
  }
  if (
    !response.isFinished &&
    (typeof response.pdfUrl !== "string" || response.pdfUrl.trim().length === 0)
  ) {
    throw new Error("La respuesta de la API no incluye el PDF del desafío actual.");
  }
  if (!Array.isArray(response.splitTimes)) {
    throw new Error("La respuesta de la API no incluye los tiempos parciales.");
  }

  const splitTimes = response.splitTimes.map((item: unknown): ChallengeSplit => {
    const split = asRecord(item, "tiempos parciales");
    const challengeNumber = asNumber(split.challengeNumber, "el número de desafío");
    const elapsedMs = asNumber(split.elapsedMs, "el tiempo parcial");
    if (!Number.isInteger(challengeNumber) || challengeNumber < 1 || elapsedMs < 0) {
      throw new Error("La respuesta de la API incluye un tiempo parcial inválido.");
    }
    return { challengeNumber, elapsedMs };
  });

  const challengeNumber = asNumber(response.challengeNumber, "el desafío actual");
  const totalChallenges = asNumber(response.totalChallenges, "la cantidad de desafíos");
  if (
    !Number.isInteger(challengeNumber) ||
    !Number.isInteger(totalChallenges) ||
    challengeNumber < 1 ||
    totalChallenges < challengeNumber
  ) {
    throw new Error("La respuesta de la API incluye un progreso de desafíos inválido.");
  }

  return {
    teamName: asString(response.teamName, "el nombre del equipo"),
    level: response.level,
    challengeNumber,
    totalChallenges,
    pdfUrl: response.pdfUrl,
    isFinished: response.isFinished,
    splitTimes,
  };
}

export function parseAnswerSubmissionResult(
  payload: unknown,
): AnswerSubmissionResult {
  const response = asRecord(payload, "el envío de respuesta");
  if (typeof response.correct !== "boolean") {
    throw new Error("La respuesta de la API no indica si la solución es correcta.");
  }
  if (response.message !== undefined && typeof response.message !== "string") {
    throw new Error("La respuesta de la API incluye un mensaje inválido.");
  }
  return {
    correct: response.correct,
    ...(typeof response.message === "string" ? { message: response.message } : {}),
  };
}

export function parseLeaderboard(payload: unknown): LeaderboardEntry[] {
  const rawEntries = Array.isArray(payload)
    ? payload
    : asRecord(payload, "la tabla de posiciones").teams;
  if (!Array.isArray(rawEntries)) {
    throw new Error("La respuesta de posiciones no incluye la lista de equipos.");
  }

  return rawEntries.flatMap((item: unknown): LeaderboardEntry[] => {
    const entry = asRecord(item, "la tabla de posiciones");
    if (!isCompetitionLevel(entry.level)) {
      throw new Error("La respuesta de posiciones incluye un nivel inválido.");
    }

    const teamName = asString(entry.teamName, "el nombre del equipo");
    const startTime = asTimestamp(entry.startTime, "el inicio de la competencia");
    if (entry.finishTime === null || entry.finishTime === undefined) return [];
    const finishTime = asTimestamp(entry.finishTime, "el final de la competencia");
    const durationMs =
      timestampToMilliseconds(finishTime) - timestampToMilliseconds(startTime);
    if (durationMs < 0) {
      throw new Error(`El tiempo registrado para ${teamName} no es válido.`);
    }

    return [{ teamName, level: entry.level, startTime, finishTime, durationMs }];
  });
}

export function formatDuration(durationMs: number): string {
  const totalCentiseconds = Math.floor(Math.max(0, durationMs) / 10);
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
