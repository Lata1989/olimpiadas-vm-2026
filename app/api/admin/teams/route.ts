import { isAdminAuthorized, isAdminTokenConfigured } from "@/lib/admin-auth";
import { TOTAL_CHALLENGES } from "@/lib/competition";
import { getTeamCollection } from "@/lib/mongodb";

export async function GET(request: Request): Promise<Response> {
  if (!isAdminAuthorized(request)) {
    const tokenConfigured = isAdminTokenConfigured();
    return Response.json(
      {
        message: tokenConfigured
          ? "Token de administración inválido."
          : "Configurá CHALLENGE_ADMIN_TOKEN con al menos 32 caracteres.",
      },
      {
        status: tokenConfigured ? 401 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  try {
    const teams = await getTeamCollection();
    const entries = await teams
      .find(
        {},
        {
          projection: {
            _id: 0,
            teamName: 1,
            level: 1,
            currentChallenge: 1,
            startTime: 1,
            challengeStartedAt: 1,
            finishTime: 1,
            totalDurationMs: 1,
            isFinished: 1,
          },
        },
      )
      .sort({ level: 1, teamName: 1 })
      .toArray();

    return Response.json(
      {
        teams: entries.map((team) => ({
          ...team,
          totalChallenges: TOTAL_CHALLENGES,
          finishTime: team.finishTime ?? null,
          totalDurationMs:
            team.totalDurationMs ??
            (team.finishTime
              ? Math.max(0, team.finishTime.getTime() - team.startTime.getTime())
              : null),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    console.error("No se pudo cargar el panel de administración.", error);
    return Response.json(
      {
        message:
          "No se pudo cargar el panel de administración. Revisá la conexión con la base de datos.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
