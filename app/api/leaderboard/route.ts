import { isAdminAuthorized, isAdminTokenConfigured } from "@/lib/admin-auth";
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

  const level = new URL(request.url).searchParams.get("level");
  if (level !== "Junior" && level !== "Senior") {
    return Response.json(
      { message: "El nivel debe ser Junior o Senior." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const teams = await getTeamCollection();
    const finishedTeams = await teams
      .find(
        { level, isFinished: true, finishTime: { $exists: true } },
        { projection: { _id: 0, teamName: 1, level: 1, startTime: 1, finishTime: 1 } },
      )
      .toArray();

    return Response.json(finishedTeams, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    console.error("No se pudo cargar la tabla de posiciones.", error);
    return Response.json(
      { message: "No se pudo cargar la tabla. Revisá la conexión con la base de datos." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
