"use client";

import { authClient } from "@/lib/auth-clients";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaCheck,
  FaCheckDouble,
  FaCircleExclamation,
  FaMagnifyingGlass,
  FaPaperPlane,
  FaTrash,
} from "react-icons/fa6";
import LogoutButton from "./LogoutButton";

type ConvoSummary = {
  conversationKey: string;
  otherId: string;
  otherName: string;
  lastContent: string;
  lastCreatedAt: string;
  lastFromMe: boolean;
  count: number;
};

type UserLite = {
  id: string;
  name: string;
  email: string | null;
  lastActiveAt: number | null;
};

type PublicMessage = {
  _id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
};

type DmMessage = {
  _id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  content: string;
  createdAt: string;
};

type ActiveConvo =
  | { kind: "public" }
  | { kind: "dm"; otherId: string; otherName: string };

const PUBLIC_MAX = 280;
const DM_MAX = 500;
const POLL_MS = 2500;
const LIST_POLL_MS = 6000;
const ONLINE_WINDOW_MS = 90_000; // <= 90s = en ligne

const OPENERS = [
  "Salut 👋",
  "Comment ça va ?",
  "T'es plutôt sushi ou ramen ? 🍣",
  "Tu fais quoi ce week-end ?",
];

/* ───────────────────────── LocalStorage helpers ───────────────────────── */

function lastSeenKey(meId: string, convoId: string) {
  return `discuss.lastSeen:${meId}:${convoId}`;
}
function readLastSeen(meId: string, convoId: string): number {
  if (typeof window === "undefined") return 0;
  const v = window.localStorage.getItem(lastSeenKey(meId, convoId));
  return v ? Number(v) : 0;
}
function writeLastSeen(meId: string, convoId: string, ts: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(lastSeenKey(meId, convoId), String(ts));
  } catch {
    /* ignore */
  }
}

/* ───────────────────────── Master ───────────────────────── */

export default function Conversations() {
  const { data: session } = authClient.useSession();
  const me = session?.user.id;

  const [users, setUsers] = useState<UserLite[]>([]);
  const [convos, setConvos] = useState<ConvoSummary[]>([]);
  const [active, setActive] = useState<ActiveConvo>({ kind: "public" });
  const [search, setSearch] = useState("");
  const [showListOnMobile, setShowListOnMobile] = useState(true);
  // tick pour rafraichir les indicateurs "en ligne / il y a 2m"
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchUsers() {
      const r = await fetch("/api/users", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      if (!cancelled) setUsers(d.users ?? []);
    }

    async function fetchConvos() {
      const r = await fetch("/api/dms", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      if (!cancelled) setConvos(d.conversations ?? []);
    }

    fetchUsers();
    fetchConvos();
    const id = setInterval(() => {
      fetchUsers();
      fetchConvos();
    }, LIST_POLL_MS);
    const tickId = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(tickId);
    };
  }, []);

  const convoByOther = useMemo(() => {
    const map = new Map<string, ConvoSummary>();
    for (const c of convos) map.set(c.otherId, c);
    return map;
  }, [convos]);

  // Liste des utilisateurs, triee : en-ligne d'abord puis activite recente
  const sortedUsers = useMemo(() => {
    const now = Date.now();
    return [...users].sort((a, b) => {
      const aOn = a.lastActiveAt ? now - a.lastActiveAt < ONLINE_WINDOW_MS : false;
      const bOn = b.lastActiveAt ? now - b.lastActiveAt < ONLINE_WINDOW_MS : false;
      if (aOn !== bOn) return aOn ? -1 : 1;
      return (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0);
    });
  }, [users]);

  const onlineUsers = useMemo(() => {
    const now = Date.now();
    return sortedUsers.filter(
      (u) => u.lastActiveAt && now - u.lastActiveAt < ONLINE_WINDOW_MS,
    );
  }, [sortedUsers]);

  const listItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = sortedUsers.filter(
      (u) => !q || u.name.toLowerCase().includes(q),
    );
    return filtered.map((u) => ({
      user: u,
      convo: convoByOther.get(u.id) ?? null,
    }));
  }, [sortedUsers, convoByOther, search]);

  // Compte des non-lus globaux et par conversation
  const unreadByConvo = useMemo(() => {
    const map = new Map<string, boolean>();
    if (!me) return map;
    for (const c of convos) {
      if (c.lastFromMe) continue;
      const seen = readLastSeen(me, `dm:${c.otherId}`);
      const lastMs = new Date(c.lastCreatedAt).getTime();
      if (lastMs > seen) map.set(c.otherId, true);
    }
    return map;
  }, [convos, me]);

  function openConvo(c: ActiveConvo) {
    setActive(c);
    setShowListOnMobile(false);
    if (me) {
      const id = c.kind === "public" ? "public" : `dm:${c.otherId}`;
      writeLastSeen(me, id, Date.now());
    }
  }

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <aside
        className={`chat-sidebar ${showListOnMobile ? "" : "hidden md:flex"}`}
      >
        <div className="px-4 pt-4 pb-3 sticky top-0 bg-[color:var(--paper)] z-10 border-b border-[color:var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <span className="app-title">Discuss</span>
            </div>
            <LogoutButton />
          </div>
          <label className="relative block">
            <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher quelqu'un…"
              className="field has-icon-left h-11"
              maxLength={40}
            />
          </label>
        </div>

        {/* Stories row — utilisateurs en ligne */}
        {onlineUsers.length > 0 && (
          <div className="px-2 py-3 border-b border-[color:var(--border)]">
            <p className="convo-section-title pt-0 pb-2 px-2">
              En ligne · {onlineUsers.length}
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-none px-2">
              {onlineUsers.slice(0, 12).map((u) => (
                <button
                  key={u.id}
                  onClick={() =>
                    openConvo({ kind: "dm", otherId: u.id, otherName: u.name })
                  }
                  className="flex flex-col items-center gap-1 shrink-0 w-16"
                >
                  <span className="story-ring">
                    <span className="story-ring-inner">
                      <span
                        className="avatar w-12 h-12 text-base"
                        style={{ background: pickColor(u.id) }}
                      >
                        {initialOf(u.name)}
                      </span>
                    </span>
                  </span>
                  <span className="text-[10px] font-semibold truncate w-full text-center">
                    {u.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-none">
          {/* Salon general (public) toujours en haut */}
          <button
            onClick={() => openConvo({ kind: "public" })}
            className={`convo-row ${active.kind === "public" ? "active" : ""}`}
          >
            <div className="relative">
              <div
                className="avatar w-12 h-12 text-lg"
                style={{
                  background:
                    "linear-gradient(135deg,#ff655b,#fd5068 55%,#ff8e3c)",
                  color: "white",
                }}
                aria-hidden
              >
                #
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-bold truncate">Salon général</p>
                <span className="live-dot text-[10px] py-0 px-2">live</span>
              </div>
              <p className="text-xs text-muted truncate">
                Discute avec toute la communauté.
              </p>
            </div>
          </button>

          <div className="convo-section-title">Conversations</div>

          {listItems.length === 0 && (
            <p className="text-sm text-muted px-4 py-6 text-center">
              Aucun utilisateur ne correspond.
            </p>
          )}

          {listItems.map(({ user, convo }) => {
            const isActive =
              active.kind === "dm" && active.otherId === user.id;
            const online =
              user.lastActiveAt &&
              Date.now() - user.lastActiveAt < ONLINE_WINDOW_MS;
            const hasUnread = unreadByConvo.get(user.id) === true;
            return (
              <button
                key={user.id}
                onClick={() =>
                  openConvo({
                    kind: "dm",
                    otherId: user.id,
                    otherName: user.name,
                  })
                }
                className={`convo-row ${isActive ? "active" : ""} ${
                  hasUnread ? "has-unread" : ""
                }`}
              >
                <div className="relative">
                  <div
                    className="avatar w-12 h-12"
                    style={{ background: pickColor(user.id) }}
                    aria-hidden
                  >
                    {initialOf(user.name)}
                  </div>
                  {online && (
                    <span
                      className="online-dot"
                      aria-label="En ligne"
                      title="En ligne"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`truncate ${hasUnread ? "font-extrabold" : "font-bold"}`}
                    >
                      {user.name}
                    </p>
                    <span className="text-[10px] text-muted shrink-0">
                      {convo
                        ? formatShort(new Date(convo.lastCreatedAt))
                        : online
                          ? "en ligne"
                          : user.lastActiveAt
                            ? formatShort(new Date(user.lastActiveAt))
                            : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-xs truncate flex-1 ${
                        hasUnread ? "text-foreground font-semibold" : "text-muted"
                      }`}
                    >
                      {convo ? (
                        <>
                          {convo.lastFromMe && (
                            <span className="text-muted">Toi : </span>
                          )}
                          {convo.lastContent}
                        </>
                      ) : (
                        "Démarre la discussion ✨"
                      )}
                    </p>
                    {hasUnread && <span className="unread-badge">●</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main pane */}
      <section
        className={`chat-main ${showListOnMobile ? "hidden md:flex" : ""}`}
      >
        {active.kind === "public" ? (
          <PublicConvo
            meId={me}
            onBack={() => setShowListOnMobile(true)}
            users={users}
            onlineCount={onlineUsers.length}
          />
        ) : (
          <DmConvo
            meId={me}
            otherId={active.otherId}
            otherName={active.otherName}
            otherUser={users.find((u) => u.id === active.otherId) ?? null}
            onBack={() => setShowListOnMobile(true)}
          />
        )}
      </section>
    </div>
  );
}

/* ───────────────────────── Public chat ───────────────────────── */

function PublicConvo({
  meId,
  onBack,
  users,
  onlineCount,
}: {
  meId: string | undefined;
  onBack: () => void;
  users: UserLite[];
  onlineCount: number;
}) {
  const [messages, setMessages] = useState<PublicMessage[] | null>(null);
  const [live, setLive] = useState<"on" | "off">("on");

  useEffect(() => {
    let cancelled = false;
    async function fetchMessages() {
      try {
        const r = await fetch("/api/messages", { cache: "no-store" });
        if (!r.ok) {
          if (!cancelled) setLive("off");
          return;
        }
        const d: PublicMessage[] = await r.json();
        if (cancelled) return;
        setLive("on");
        setMessages(d);
      } catch {
        if (!cancelled) setLive("off");
      }
    }
    fetchMessages();
    const id = setInterval(fetchMessages, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // marque le salon comme lu quand on l'a a l'ecran
  useEffect(() => {
    if (meId && messages && messages.length > 0) {
      writeLastSeen(meId, "public", Date.now());
    }
  }, [meId, messages]);

  const sorted = useMemo(() => {
    if (!messages) return [];
    return [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [messages]);

  return (
    <ConvoFrame
      onBack={onBack}
      title="Salon général"
      subtitle={
        <>
          <span className="live-dot text-[10px] py-0 px-2">
            {live === "on" ? "live" : "off"}
          </span>
          <span>
            {sorted.length} message{sorted.length > 1 ? "s" : ""}
          </span>
          <span>
            · {onlineCount} en ligne · {users.length + 1} membre(s)
          </span>
        </>
      }
      avatar={
        <div
          className="avatar"
          style={{
            background: "linear-gradient(135deg,#ff655b,#fd5068 55%,#ff8e3c)",
            color: "white",
          }}
        >
          #
        </div>
      }
    >
      <MessageList
        messages={sorted.map<UniMessage>((m) => ({
          _id: m._id,
          authorId: m.userId,
          authorName: m.userName,
          content: m.content,
          createdAt: m.createdAt,
        }))}
        meId={meId}
        deleteEndpoint="/api/messages"
        loading={messages === null}
        receipts={false}
      />
      <Composer
        endpoint="/api/messages"
        maxLength={PUBLIC_MAX}
        placeholder="Écris au salon…"
      />
    </ConvoFrame>
  );
}

/* ───────────────────────── DM chat ───────────────────────── */

function DmConvo({
  meId,
  otherId,
  otherName,
  otherUser,
  onBack,
}: {
  meId: string | undefined;
  otherId: string;
  otherName: string;
  otherUser: UserLite | null;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<DmMessage[] | null>(null);
  const [live, setLive] = useState<"on" | "off">("on");
  const [draft, setDraft] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setMessages(null);
    async function fetchMessages() {
      try {
        const r = await fetch(`/api/dms/${otherId}`, { cache: "no-store" });
        if (!r.ok) {
          if (!cancelled) setLive("off");
          return;
        }
        const d = await r.json();
        if (cancelled) return;
        setLive("on");
        setMessages(d.messages ?? []);
      } catch {
        if (!cancelled) setLive("off");
      }
    }
    fetchMessages();
    const id = setInterval(fetchMessages, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [otherId]);

  // Marque la conversation comme lue tant qu'elle est ouverte
  useEffect(() => {
    if (meId && messages && messages.length > 0) {
      writeLastSeen(meId, `dm:${otherId}`, Date.now());
    }
  }, [meId, otherId, messages]);

  const online =
    otherUser?.lastActiveAt &&
    Date.now() - otherUser.lastActiveAt < ONLINE_WINDOW_MS;
  const lastSeenText = online
    ? "en ligne"
    : otherUser?.lastActiveAt
      ? `vu(e) ${formatShort(new Date(otherUser.lastActiveAt))}`
      : "hors-ligne";

  return (
    <ConvoFrame
      onBack={onBack}
      title={otherName}
      subtitle={
        <span className="flex items-center gap-1.5">
          {online ? (
            <span className="online-dot static-dot" aria-hidden />
          ) : (
            <span className="offline-dot" aria-hidden />
          )}
          <span>{lastSeenText}</span>
          <span className="hidden sm:inline">· Conversation privée 🔒</span>
        </span>
      }
      avatar={
        <div className="relative">
          <div
            className="avatar w-11 h-11"
            style={{ background: pickColor(otherId) }}
            aria-hidden
          >
            {initialOf(otherName)}
          </div>
          {online && <span className="online-dot" aria-hidden />}
        </div>
      }
    >
      <MessageList
        messages={
          messages?.map<UniMessage>((m) => ({
            _id: m._id,
            authorId: m.fromId,
            authorName: m.fromName,
            content: m.content,
            createdAt: m.createdAt,
          })) ?? []
        }
        meId={meId}
        deleteEndpoint={null}
        loading={messages === null}
        receipts={true}
        otherLastMessageAt={
          messages?.length
            ? Math.max(
                ...messages
                  .filter((m) => m.fromId === otherId)
                  .map((m) => new Date(m.createdAt).getTime()),
                0,
              )
            : 0
        }
        emptyExtras={
          messages && messages.length === 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {OPENERS.map((o) => (
                <button
                  key={o}
                  onClick={() => setDraft(o)}
                  className="chip hover:bg-[color:var(--surface-ghost-hover)] transition"
                  type="button"
                >
                  {o}
                </button>
              ))}
            </div>
          ) : null
        }
      />
      <Composer
        endpoint={`/api/dms/${otherId}`}
        maxLength={DM_MAX}
        placeholder={`Écris à ${otherName}…`}
        externalDraft={draft}
        onDraftConsumed={() => setDraft("")}
      />
    </ConvoFrame>
  );
}

/* ───────────────────────── Convo frame ───────────────────────── */

function ConvoFrame({
  onBack,
  title,
  subtitle,
  avatar,
  children,
}: {
  onBack: () => void;
  title: string;
  subtitle: React.ReactNode;
  avatar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      <header className="convo-header">
        <button
          onClick={onBack}
          className="btn btn-icon btn-ghost w-9 h-9 md:hidden"
          aria-label="Retour"
        >
          <FaArrowLeft />
        </button>
        {avatar}
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{title}</p>
          <p className="text-[11px] text-muted flex flex-wrap gap-x-1.5 items-center">
            {subtitle}
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}

/* ───────────────────────── Message list ───────────────────────── */

type UniMessage = {
  _id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

function MessageList({
  messages,
  meId,
  deleteEndpoint,
  loading,
  receipts,
  otherLastMessageAt,
  emptyExtras,
}: {
  messages: UniMessage[];
  meId: string | undefined;
  deleteEndpoint: string | null;
  loading: boolean;
  receipts: boolean;
  otherLastMessageAt?: number;
  emptyExtras?: React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);
  const lastCountRef = useRef(0);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    wasAtBottomRef.current = dist < 80;
  }

  useEffect(() => {
    const isFirst = lastCountRef.current === 0;
    const hasNew = messages.length > lastCountRef.current;
    lastCountRef.current = messages.length;
    if ((isFirst || (hasNew && wasAtBottomRef.current)) && bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: isFirst ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [messages]);

  async function handleDelete(id: string) {
    if (!deleteEndpoint || !meId) return;
    await fetch(deleteEndpoint, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id, userId: meId }),
    });
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted">
        <div className="w-7 h-7 border-3 border-current border-r-transparent rounded-full animate-spin opacity-40" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 text-muted">
        <div className="text-5xl mb-3 heart-beat">💌</div>
        <p className="font-semibold text-foreground">Aucun message</p>
        <p className="text-sm mt-1 max-w-xs">
          Brise la glace, envoie le premier mot.
        </p>
        {emptyExtras}
      </div>
    );
  }

  const items: Array<
    | { kind: "sep"; key: string; label: string }
    | { kind: "msg"; key: string; m: UniMessage; sameAuthor: boolean }
  > = [];
  let lastDay = "";
  let lastAuthor = "";
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const dayKey = d.toDateString();
    if (dayKey !== lastDay) {
      items.push({ kind: "sep", key: `sep-${dayKey}`, label: formatDay(d) });
      lastDay = dayKey;
      lastAuthor = "";
    }
    items.push({
      kind: "msg",
      key: m._id,
      m,
      sameAuthor: m.authorId === lastAuthor,
    });
    lastAuthor = m.authorId;
  }

  // Trouve le dernier message qu'on a envoye (pour l'accuse de lecture)
  const lastOwnIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].authorId === meId) return i;
    }
    return -1;
  })();
  const lastOwnId = lastOwnIdx >= 0 ? messages[lastOwnIdx]._id : null;
  const lastOwnSeen =
    !!receipts &&
    lastOwnId !== null &&
    !!otherLastMessageAt &&
    otherLastMessageAt > new Date(messages[lastOwnIdx].createdAt).getTime();

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 flex flex-col gap-1 scrollbar-none"
    >
      {items.map((it) =>
        it.kind === "sep" ? (
          <div key={it.key} className="day-sep">
            {it.label}
          </div>
        ) : (
          <Bubble
            key={it.key}
            m={it.m}
            isOwn={it.m.authorId === meId}
            sameAuthor={it.sameAuthor}
            onDelete={deleteEndpoint ? () => handleDelete(it.m._id) : null}
            showReceipt={receipts && it.m._id === lastOwnId}
            seen={lastOwnSeen}
          />
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function Bubble({
  m,
  isOwn,
  sameAuthor,
  onDelete,
  showReceipt,
  seen,
}: {
  m: UniMessage;
  isOwn: boolean;
  sameAuthor: boolean;
  onDelete: (() => void) | null;
  showReceipt: boolean;
  seen: boolean;
}) {
  const time = new Date(m.createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div
      className={`fade-in flex items-end gap-2 ${
        isOwn ? "justify-end" : "justify-start"
      } ${sameAuthor ? "mt-0.5" : "mt-2"}`}
    >
      {!isOwn &&
        (sameAuthor ? (
          <span className="w-8 shrink-0" aria-hidden />
        ) : (
          <div
            className="avatar w-8 h-8 text-xs"
            style={{ background: pickColor(m.authorId) }}
          >
            {initialOf(m.authorName)}
          </div>
        ))}
      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && !sameAuthor && (
          <p className="text-[11px] font-semibold text-muted mb-1 px-1">
            {m.authorName}
          </p>
        )}
        <div className="group relative flex items-end gap-1.5">
          <div className={`bubble ${isOwn ? "bubble-own" : "bubble-other"}`}>
            {m.content}
          </div>
          {isOwn && onDelete && (
            <button
              onClick={onDelete}
              aria-label="Supprimer"
              className="opacity-0 group-hover:opacity-100 transition w-7 h-7 rounded-full bg-[color:var(--danger)] text-white flex items-center justify-center text-[11px] shadow"
            >
              <FaTrash />
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted mt-0.5 px-1 font-medium flex items-center gap-1">
          {time}
          {showReceipt &&
            (seen ? (
              <FaCheckDouble className="text-[color:var(--tinder-via)]" />
            ) : (
              <FaCheck className="text-muted" />
            ))}
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── Composer ───────────────────────── */

function Composer({
  endpoint,
  maxLength,
  placeholder,
  externalDraft,
  onDraftConsumed,
}: {
  endpoint: string;
  maxLength: number;
  placeholder: string;
  externalDraft?: string;
  onDraftConsumed?: () => void;
}) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannedUntil, setBannedUntil] = useState<number>(0);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (externalDraft && externalDraft.length > 0) {
      setContent(externalDraft);
      onDraftConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalDraft]);

  useEffect(() => {
    if (bannedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [bannedUntil]);

  const trimmed = content.trim();
  const tooLong = content.length > maxLength;
  const banRemainingMs = Math.max(0, bannedUntil - now);
  const isBanned = banRemainingMs > 0;
  const canSend = trimmed.length > 0 && !tooLong && !sending && !isBanned;

  async function send(e: React.SubmitEvent) {
    e.preventDefault();
    if (!canSend) return;
    setError(null);
    setSending(true);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => null)) as {
          error?: string;
          bannedUntilMs?: number;
          retryAfterSeconds?: number;
        } | null;
        if (r.status === 429 && d?.bannedUntilMs) {
          setBannedUntil(d.bannedUntilMs);
          setNow(Date.now());
        }
        throw new Error(d?.error ?? "Envoi impossible.");
      }
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'envoi");
    } finally {
      setSending(false);
    }
  }

  const counterClass = tooLong
    ? "char-counter over"
    : content.length >= maxLength * 0.85
      ? "char-counter warn"
      : "char-counter";

  return (
    <form onSubmit={send} className="convo-composer">
      {isBanned && (
        <div className="error-banner mb-2">
          <FaCircleExclamation className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Envoi temporairement bloqué</p>
            <p className="text-xs opacity-90">
              Pour cause de spam. Tu pourras renvoyer dans{" "}
              <span className="font-mono font-bold">
                {formatCountdown(banRemainingMs)}
              </span>
              .
            </p>
          </div>
        </div>
      )}
      {!isBanned && error && (
        <p className="text-xs text-danger px-1 flex items-center gap-1.5 mb-2">
          <FaCircleExclamation /> {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={content}
            placeholder={isBanned ? "Tu es bloqué pour spam…" : placeholder}
            maxLength={maxLength + 20}
            disabled={isBanned}
            onChange={(e) => setContent(e.target.value)}
            className="field pr-20 disabled:opacity-50"
            aria-label="Nouveau message"
          />
          <span
            className={`${counterClass} absolute right-4 top-1/2 -translate-y-1/2`}
          >
            {content.length}/{maxLength}
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
    </form>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

function initialOf(name: string) {
  return (name ?? "?").charAt(0).toUpperCase();
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

function formatDay(d: Date) {
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

function formatShort(d: Date) {
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  if (d.toDateString() === now.toDateString()) return "auj.";
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function formatCountdown(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return `${m}min ${String(rs).padStart(2, "0")}s`;
}
