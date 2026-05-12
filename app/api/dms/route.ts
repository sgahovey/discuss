import { auth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { markActive } from "@/lib/presence";

/**
 * Liste mes conversations privees :
 * pour chaque conversationKey ou je suis impliquee, on retourne
 * le dernier message + l'autre participant.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }
  markActive(session.user.id);

  const rl = rateLimit({
    key: `${session.user.id}:dms-list`,
    max: 60,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requetes." }, { status: 429 });
  }

  const me = session.user.id;
  const db = await getDb();

  const pipeline = [
    { $match: { $or: [{ fromId: me }, { toId: me }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$conversationKey",
        lastContent: { $first: "$content" },
        lastCreatedAt: { $first: "$createdAt" },
        lastFromId: { $first: "$fromId" },
        fromId: { $first: "$fromId" },
        toId: { $first: "$toId" },
        fromName: { $first: "$fromName" },
        toName: { $first: "$toName" },
        count: { $sum: 1 },
      },
    },
    { $sort: { lastCreatedAt: -1 } },
    { $limit: 100 },
  ];

  const convos = await db
    .collection("dms")
    .aggregate(pipeline)
    .toArray();

  const result = convos.map((c) => {
    const otherId = c.fromId === me ? c.toId : c.fromId;
    const otherName = c.fromId === me ? c.toName : c.fromName;
    return {
      conversationKey: c._id,
      otherId,
      otherName: otherName ?? "Anonyme",
      lastContent: c.lastContent,
      lastCreatedAt: c.lastCreatedAt,
      lastFromMe: c.lastFromId === me,
      count: c.count,
    };
  });

  return NextResponse.json({ conversations: result });
}
