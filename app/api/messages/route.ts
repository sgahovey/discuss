import { auth } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const db = await getDb();
  const messages = await db.collection("messages").find().toArray();
  return NextResponse.json(messages);
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session)
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { _id, userId } = await request.json();

  if (!_id || !userId)
    return NextResponse.json({ error: "Json non valide" }, { status: 400 });

  if (userId != session.user.id)
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const db = await getDb();
  await db.collection("messages").deleteOne({ _id: new ObjectId(_id) });

  return NextResponse.json({ _id }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session)
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { content } = await request.json();

  if (!content)
    return NextResponse.json({ error: "Message vide" }, { status: 400 });

  const db = await getDb();
  const message = {
    content: content,
    createdAt: new Date(),
    userId: session.user.id,
    userName: session.user.name,
  };
  await db.collection("messages").insertOne(message);
  return NextResponse.json(message, { status: 201 });
}