import { getTeamCollection } from "@/lib/mongodb";

export async function GET(request: Request): Promise<Response> {
  const level = new URL(request.url).searchParams.get("level");
  if (level !== "Junior" && level !== "Senior") {
    return Response.json(
      { message: "El nivel debe ser Junior o Senior." },
      { status: 400 },
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

    return Response.json(finishedTeams);
  } catch (error: unknown) {
    console.error("No se pudo cargar la tabla de posiciones.", error);
    return Response.json(
      { message: "No se pudo cargar la tabla. Revisá la conexión con la base de datos." },
      { status: 500 },
    );
  }
}
