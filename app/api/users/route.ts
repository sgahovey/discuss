import { auth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAllLastActive, markActive } from "@/lib/presence";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }
  markActive(session.user.id);

  const rl = rateLimit({
    key: `${session.user.id}:users-get`,
    max: 60,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requetes." }, { status: 429 });
  }

  const db = await getDb();
  const rawUsers = await db
    .collection("user")
    .find({}, { projection: { name: 1, email: 1 } })
    .limit(200)
    .toArray();

  const activeMap = getAllLastActive();
  const me = session.user.id;

  const users = rawUsers
    .map((u) => {
      // Better-auth stocke l'id sous _id (string ou ObjectId)
      const id =
        typeof u._id === "string" ? u._id : (u._id?.toString?.() ?? "");
      return {
        id,
        name: (u.name as string | undefined) ?? "Anonyme",
        email: (u.email as string | undefined) ?? null,
        lastActiveAt: activeMap[id] ?? null,
      };
    })
    .filter((u) => u.id && u.id !== me);

  return NextResponse.json({ users });
}
