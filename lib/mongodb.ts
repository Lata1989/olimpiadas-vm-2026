import { MongoClient, type Collection, type Document, type Db } from "mongodb";

export interface TeamSplitTime extends Document {
  challengeNumber: number;
  elapsedMs: number;
}

export interface TeamDocument extends Document {
  teamId: string;
  teamIdentityKey?: string;
  teamName: string;
  level: "Junior" | "Senior";
  members: string[];
  startTime: Date;
  currentChallenge: number;
  challengeStartedAt: Date;
  isFinished: boolean;
  splitTimes: TeamSplitTime[];
  finishTime?: Date;
}

export interface ChallengeDocument extends Document {
  level: "Junior" | "Senior";
  challengeNumber: number;
  pdfUrl: string;
  answer: string;
}

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

function createMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Falta configurar MONGODB_URI para conectar con la base de datos.");
  }

  const client = new MongoClient(uri);
  return client.connect();
}

export async function getDatabase(): Promise<Db> {
  globalThis.mongoClientPromise ??= createMongoClient();
  const client = await globalThis.mongoClientPromise;
  return client.db(process.env.MONGODB_DB);
}

export async function getTeamCollection(): Promise<Collection<TeamDocument>> {
  const database = await getDatabase();
  const collection = database.collection<TeamDocument>("teams");
  await collection.createIndex({ teamId: 1 }, { unique: true });
  return collection;
}

export async function getChallengeCollection(): Promise<
  Collection<ChallengeDocument>
> {
  const database = await getDatabase();
  const collection = database.collection<ChallengeDocument>("challenges");
  await collection.createIndex(
    { level: 1, challengeNumber: 1 },
    { unique: true },
  );
  return collection;
}
