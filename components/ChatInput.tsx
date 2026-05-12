"use client";

import { useState } from "react";
import { FaPaperPlane } from "react-icons/fa6";

const MAX_LEN = 280;

export default function ChatInput() {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const trimmed = content.trim();
  const tooLong = content.length > MAX_LEN;
  const canSend = trimmed.length > 0 && !tooLong && !sending;

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (!canSend) return;
    setErrorMsg(null);
    setSending(true);
    try {
      const request = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!request.ok) throw new Error("L'envoi a echoue.");
      setContent("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  }

  const counterClass = tooLong
    ? "char-counter over"
    : content.length >= MAX_LEN * 0.85
      ? "char-counter warn"
      : "char-counter";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={content}
            placeholder="Écris un message…"
            maxLength={MAX_LEN + 20}
            onChange={(e) => setContent(e.target.value)}
            className="field pr-20"
            aria-label="Nouveau message"
          />
          <span
            className={`${counterClass} absolute right-4 top-1/2 -translate-y-1/2`}
          >
            {content.length}/{MAX_LEN}
          </span>
        </div>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Envoyer"
          className="btn btn-icon btn-flame"
        >
          <FaPaperPlane className="w-4 h-4" />
        </button>
      </div>
      {errorMsg && (
        <p className="text-xs text-danger px-1">{errorMsg}</p>
      )}
      {tooLong && !errorMsg && (
        <p className="text-xs text-danger px-1">
          Trop long de {content.length - MAX_LEN} caractère
          {content.length - MAX_LEN > 1 ? "s" : ""}.
        </p>
      )}
    </form>
  );
}
