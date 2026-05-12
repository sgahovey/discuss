"use client";

import { useState } from "react";

export default function ChatInput() {
  const [content, setContent] = useState("");

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    const request = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (request.ok) {
      e.target.reset();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Votre Message..."
        onChange={(e) => setContent(e.target.value)}
      />
      <button type="submit">Envoyer</button>
    </form>
  );
}