"use client";

import Message from "@/types/Message";
import { FaTrash } from "react-icons/fa";

export default function CardMessage({
  m,
  userId,
}: {
  m: Message;
  userId: string | undefined;
}) {
  const isOwn = m.userId === userId;

  async function deleteMessage(_id: string, userId: string | undefined) {
    const request = await fetch("/api/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id, userId }),
    });
    if (!request.ok) {
      const data = await request.json();
      console.log(data);
    }
  }

  function handleClick() {
    deleteMessage(m._id, userId);
  }

  return (
    <div
      key={m._id}
      className={`flex flex-col rounded ${isOwn ? "items-end" : "items-start"}`}
    >
      {!isOwn && <p>{m.userName}</p>}
      <p>{m.content}</p>
      <p>{new Date(m.createdAt).toLocaleTimeString("fr-FR")}</p>
      {isOwn && (
        <button onClick={handleClick}>
          <FaTrash />
        </button>
      )}
    </div>
  );
}