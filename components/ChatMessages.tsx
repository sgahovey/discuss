"use client";

import { authClient } from "@/lib/auth-clients";
import { useEffect, useState } from "react";
import CardMessage from "./CardMessage";
import Message from "@/types/Message";

export default function ChatMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    async function fetchMessages() {
      const request = await fetch("/api/messages");
      if (!request.ok) {
        console.log(request.status);
        return;
      }
      const data = await request.json();
      setMessages(data);
    }
    fetchMessages();
  }, []);

  if (messages.length === 0) {
    return <div>Aucun Message.</div>;
  }

  return (
    <div className="p-4 flex gap-4 flex-col">
      {messages.map((m) => (
        <CardMessage m={m} userId={session?.user.id} key={m._id} />
      ))}
    </div>
  );
}