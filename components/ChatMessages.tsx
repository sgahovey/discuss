"use client";

import { authClient } from "@/lib/auth-clients";
import { useEffect, useMemo, useRef, useState } from "react";
import CardMessage from "./CardMessage";
import Message from "@/types/Message";

const POLL_INTERVAL_MS = 2500;
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

export default function ChatMessages() {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [live, setLive] = useState<"on" | "reconnecting">("on");
  const { data: session } = authClient.useSession();

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);
  const lastCountRef = useRef(0);

  // Polling temps reel
  useEffect(() => {
    let cancelled = false;

    async function fetchMessages() {
      try {
        const request = await fetch("/api/messages", { cache: "no-store" });
        if (!request.ok) {
          if (!cancelled) setLive("reconnecting");
          return;
        }
        const data: Message[] = await request.json();
        if (cancelled) return;
        setLive("on");
        setMessages(data);
      } catch {
        if (!cancelled) setLive("reconnecting");
      }
    }

    fetchMessages();
    const id = setInterval(fetchMessages, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Detecte si l'utilisateur est en bas avant chaque maj
  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    wasAtBottomRef.current = distFromBottom < 80;
  }

  // Auto-scroll quand un nouveau message arrive
  useEffect(() => {
    if (!messages) return;
    const isFirstLoad = lastCountRef.current === 0;
    const hasNew = messages.length > lastCountRef.current;
    lastCountRef.current = messages.length;
    if ((isFirstLoad || (hasNew && wasAtBottomRef.current)) && bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: isFirstLoad ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [messages]);

  // Tri stable par date asc + groupes par jour
  const sorted = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [messages]);

  // Stats
  const stats = useMemo(() => {
    const now = Date.now();
    const activeIds = new Set<string>();
    for (const m of sorted) {
      if (now - new Date(m.createdAt).getTime() < ACTIVE_WINDOW_MS) {
        activeIds.add(m.userId);
      }
    }
    return {
      total: sorted.length,
      active: activeIds.size,
    };
  }, [sorted]);

  if (messages === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted">
        <div className="w-8 h-8 border-3 border-current border-r-transparent rounded-full animate-spin opacity-40" />
        <p className="mt-3 text-sm">Chargement de la conversation…</p>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-8 py-20 text-muted">
        <div className="text-5xl sm:text-6xl mb-3 heart-beat">💬</div>
        <p className="font-semibold text-foreground text-lg">
          Aucun message pour l&apos;instant
        </p>
        <p className="text-sm mt-1 max-w-xs">
          Brise la glace, envoie le premier mot — la magie commence ici.
        </p>
      </div>
    );
  }

  // Construit la liste d'items (messages + separateurs)
  const items: Array<
    | { kind: "sep"; key: string; label: string }
    | { kind: "msg"; key: string; m: Message; sameAuthorAsPrev: boolean }
  > = [];
  let lastDayKey = "";
  let lastAuthor = "";

  for (const m of sorted) {
    const d = new Date(m.createdAt);
    const dayKey = d.toDateString();
    if (dayKey !== lastDayKey) {
      items.push({
        kind: "sep",
        key: `sep-${dayKey}`,
        label: formatDayLabel(d),
      });
      lastDayKey = dayKey;
      lastAuthor = "";
    }
    items.push({
      kind: "msg",
      key: m._id,
      m,
      sameAuthorAsPrev: m.userId === lastAuthor,
    });
    lastAuthor = m.userId;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="stats-row">
        <span className="live-dot">
          {live === "on" ? "En direct" : "Reconnexion…"}
        </span>
        <span className="stat-pill">
          💬 <span className="num">{stats.total}</span>&nbsp;message
          {stats.total > 1 ? "s" : ""}
        </span>
        <span className="stat-pill">
          🟢 <span className="num">{stats.active}</span>&nbsp;actif
          {stats.active > 1 ? "s" : ""}
        </span>
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto py-3 flex flex-col gap-1.5 scrollbar-none"
      >
        {items.map((it) =>
          it.kind === "sep" ? (
            <div key={it.key} className="day-sep">
              {it.label}
            </div>
          ) : (
            <CardMessage
              key={it.key}
              m={it.m}
              userId={session?.user.id}
              compact={it.sameAuthorAsPrev}
            />
          ),
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function formatDayLabel(d: Date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
