"use client";

import Message from "@/types/Message";
import { FaTrash } from "react-icons/fa6";

export default function CardMessage({
  m,
  userId,
  compact,
}: {
  m: Message;
  userId: string | undefined;
  compact?: boolean;
}) {
  const isOwn = m.userId === userId;

  async function deleteMessage(_id: string, uid: string | undefined) {
    const request = await fetch("/api/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id, userId: uid }),
    });
    if (!request.ok) {
      const data = await request.json().catch(() => null);
      console.log(data);
    }
  }

  function handleDelete() {
    deleteMessage(m._id, userId);
  }

  const time = new Date(m.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const initial = (m.userName ?? "?").charAt(0).toUpperCase();

  return (
    <div
      className={`fade-in flex items-end gap-2 ${
        isOwn ? "justify-end" : "justify-start"
      } ${compact ? "mt-0.5" : "mt-2"}`}
    >
      {!isOwn &&
        (compact ? (
          <span className="w-8 shrink-0" aria-hidden />
        ) : (
          <div
            className="avatar w-8 h-8 text-xs"
            style={{ background: pickColor(m.userId) }}
          >
            {initial}
          </div>
        ))}

      <div
        className={`flex flex-col ${
          isOwn ? "items-end" : "items-start"
        } max-w-full`}
      >
        {!isOwn && !compact && (
          <p className="text-[11px] font-semibold text-muted mb-1 px-1">
            {m.userName}
          </p>
        )}

        <div className="group relative flex items-end gap-1.5">
          <div className={`bubble ${isOwn ? "bubble-own" : "bubble-other"}`}>
            {m.content}
          </div>
          {isOwn && (
            <button
              onClick={handleDelete}
              aria-label="Supprimer"
              className="opacity-0 group-hover:opacity-100 transition w-7 h-7 rounded-full bg-[color:var(--danger)] text-white flex items-center justify-center text-[11px] shadow"
            >
              <FaTrash />
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted mt-0.5 px-1 font-medium">{time}</p>
      </div>
    </div>
  );
}

function pickColor(seed: string) {
  const palette = [
    "linear-gradient(135deg,#ff655b,#fd5068 60%,#ff8e9c)",
    "linear-gradient(135deg,#fffc00,#ffd166 60%,#ff8e3c)",
    "linear-gradient(135deg,#7b61ff,#ff5edf 60%,#ff655b)",
    "linear-gradient(135deg,#00d5ff,#7b61ff 60%,#ff5edf)",
    "linear-gradient(135deg,#34d399,#00d5ff 60%,#7b61ff)",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
