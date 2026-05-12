import { auth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { validateMessage, validateUserId } from "@/lib/content-validator";
import {
  addStrike,
  checkBan,
  detectBurst,
  detectDuplicate,
  detectLowSignal,
  detectTooFast,
  recordMessage,
} from "@/lib/anti-spam";
import { markActive } from "@/lib/presence";

function makeKey(a: string, b: string) {
  return [a, b].sort().join("_");
}

function banResponse(info: { retryAfterMs: number; reason: string }) {
  const secs = Math.ceil(info.retryAfterMs / 1000);
  return NextResponse.json(
    {
      error: info.reason,
      bannedUntilMs: Date.now() + info.retryAfterMs,
      retryAfterSeconds: secs,
    },
    {
      status: 429,
      headers: { "Retry-After": String(secs) },
    },
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ otherId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }
  markActive(session.user.id);

  const { otherId } = await params;
  if (!validateUserId(otherId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }
  if (otherId === session.user.id) {
    return NextResponse.json(
      { error: "On ne discute pas avec soi-meme" },
      { status: 400 },
    );
  }

  const rl = rateLimit({
    key: `${session.user.id}:dm-get`,
    max: 120,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Trop de requetes." }, { status: 429 });
  }

  const db = await getDb();
  const messages = await db
    .collection("dms")
    .find({
      $or: [
        { fromId: session.user.id, toId: otherId },
        { fromId: otherId, toId: session.user.id },
      ],
    })
    .sort({ createdAt: 1 })
    .limit(500)
    .toArray();

  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ otherId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }
  markActive(session.user.id);

  const { otherId } = await params;
  if (!validateUserId(otherId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }
  if (otherId === session.user.id) {
    return NextResponse.json(
      { error: "Tu ne peux pas t'ecrire a toi-meme" },
      { status: 400 },
    );
  }

  // 1. Banni ?
  const ban = checkBan(session.user.id);
  if (ban.banned) return banResponse(ban);

  // 2. Rate limit : 15 msg/min
  const rl = rateLimit({
    key: `${session.user.id}:dm-post`,
    max: 15,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    const after = addStrike(session.user.id, "rate-limit");
    if (after.banned) return banResponse(after);
    return NextResponse.json(
      {
        error: `Tu envoies trop vite, attends ${Math.ceil(rl.retryAfterMs / 1000)}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      },
    );
  }

  // 3. Destinataire existe ?
  const db = await getDb();
  // Better-auth stocke l'id sous _id (string ou ObjectId selon le driver)
  let other = await db
    .collection("user")
    .findOne(
      { _id: otherId as unknown as never },
      { projection: { name: 1 } },
    );
  if (!other) {
    try {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(otherId)) {
        other = await db
          .collection("user")
          .findOne(
            { _id: new ObjectId(otherId) },
            { projection: { name: 1 } },
          );
      }
    } catch {
      /* ignore */
    }
  }
  if (!other) {
    return NextResponse.json({ error: "Utilisateur inconnu" }, { status: 404 });
  }

  // 4. Parse + validation contenu
  let body: { content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Json non valide" }, { status: 400 });
  }

  const validation = validateMessage(body.content, { max: 500 });
  if (!validation.ok) {
    const after = addStrike(session.user.id, `content:${validation.reason}`);
    if (after.banned) return banResponse(after);
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  // 5. Slow-mode
  const fastWaitMs = detectTooFast(session.user.id);
  if (fastWaitMs > 0) {
    return NextResponse.json(
      { error: `Ralentis un peu (attends ${Math.ceil(fastWaitMs / 100) * 100}ms).` },
      { status: 429 },
    );
  }

  // 6. Burst
  if (detectBurst(session.user.id)) {
    const after = addStrike(session.user.id, "burst");
    if (after.banned) return banResponse(after);
    return NextResponse.json(
      { error: "Tu envoies une rafale de messages. Respire un peu." },
      { status: 429 },
    );
  }

  // 7. Low-signal
  if (detectLowSignal(session.user.id, validation.value.length)) {
    const after = addStrike(session.user.id, "low-signal");
    if (after.banned) return banResponse(after);
    return NextResponse.json(
      {
        error:
          "Trop de messages tres courts d'affilee. Ecris plus consistant ✨",
      },
      { status: 400 },
    );
  }

  // 8. Doublons (limites au couple)
  if (detectDuplicate(`${session.user.id}->${otherId}`, validation.value)) {
    const after = addStrike(session.user.id, "duplicate");
    if (after.banned) return banResponse(after);
    return NextResponse.json(
      { error: "Tu viens d'envoyer le meme message. Patiente ✨" },
      { status: 400 },
    );
  }

  // 9. OK → on enregistre et on insere
  recordMessage(session.user.id, validation.value.length);
  const conversationKey = makeKey(session.user.id, otherId);
  const doc = {
    _id: new ObjectId(),
    conversationKey,
    fromId: session.user.id,
    fromName: session.user.name,
    toId: otherId,
    toName: (other.name as string | undefined) ?? "Anonyme",
    content: validation.value,
    createdAt: new Date(),
  };
  await db.collection("dms").insertOne(doc);

  return NextResponse.json(doc, { status: 201 });
}
