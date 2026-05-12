"use client";

import { authClient } from "@/lib/auth-clients";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PacmanLoader } from "react-spinners";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCircleExclamation,
} from "react-icons/fa6";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      setErrorMsg(error.message ?? "Identifiants invalides.");
      setLoading(false);
      return;
    }
    router.push("/chat");
    router.refresh();
  }

  return (
    <main className="page grid lg:grid-cols-2">
      <aside className="bg-flame relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden">
        <svg
          className="ghost absolute top-16 right-16 w-24 h-24 text-[#fffc00] opacity-30"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2c-3.86 0-7 3.14-7 7v6.5c0 .55.45 1 1 1h.5c.28 0 .5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5h6c.28 0 .5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5h.5c.55 0 1-.45 1-1V9c0-3.86-3.14-7-7-7Z" />
        </svg>
        <a href="/" className="flex items-center gap-2 w-fit">
          <span className="text-2xl">💬</span>
          <span className="font-extrabold text-xl tracking-tight">Discuss</span>
        </a>
        <div className="fade-up">
          <h2 className="text-5xl xl:text-6xl font-black leading-[0.95] tracking-tight">
            Hey,
            <br />
            content de te revoir.
          </h2>
          <p className="mt-6 text-white/90 text-lg max-w-md leading-relaxed">
            Reconnecte-toi et reprends les conversations là où tu les avais
            laissées.
          </p>
        </div>
        <p className="text-white/75 text-xs">
          Made with <span className="heart-beat">❤️</span> & ✨
        </p>
      </aside>

      <section className="bg-canvas flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md fade-up">
          <a
            href="/"
            className="lg:hidden flex items-center justify-center gap-2 mb-6"
          >
            <span className="text-2xl">💬</span>
            <span className="font-extrabold text-xl tracking-tight">
              Discuss
            </span>
          </a>

          <form
            onSubmit={handleSubmit}
            className="card p-6 sm:p-9 flex flex-col gap-5"
          >
            <header className="text-center">
              <span className="chip">
                <span className="heart-beat">👋</span> Reconnexion
              </span>
              <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
                Te revoilà !
              </h1>
              <p className="text-muted text-sm sm:text-base mt-2">
                Connecte-toi pour reprendre la discussion.
              </p>
            </header>

            {errorMsg && (
              <div className="error-banner">
                <FaCircleExclamation className="mt-0.5 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <Field
                label="Email"
                icon={<FaEnvelope />}
                type="email"
                placeholder="toi@exemple.com"
                autoComplete="email"
                required
                maxLength={100}
                value={email}
                onChange={setEmail}
              />
              <Field
                label="Mot de passe"
                icon={<FaLock />}
                type={showPassword ? "text" : "password"}
                placeholder="Ton mot de passe"
                autoComplete="current-password"
                required
                maxLength={72}
                value={password}
                onChange={setPassword}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-muted hover:text-foreground transition"
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                }
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-flame w-full mt-1"
            >
              {loading ? (
                <PacmanLoader size={10} color="#fff" />
              ) : (
                "Se connecter"
              )}
            </button>

            <p className="text-center text-sm text-muted">
              Pas encore de compte ?{" "}
              <a
                href="/register"
                className="font-bold underline decoration-2 underline-offset-2"
                style={{ color: "var(--tinder-via)" }}
              >
                Inscris-toi
              </a>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  icon,
  trailing,
  onChange,
  maxLength,
  value,
  ...rest
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="field-label flex items-baseline justify-between">
        <span>{label}</span>
        {typeof maxLength === "number" && typeof value === "string" && (
          <span
            className={`char-counter ${
              value.length >= maxLength
                ? "over"
                : value.length >= maxLength * 0.85
                  ? "warn"
                  : ""
            }`}
          >
            {value.length}/{maxLength}
          </span>
        )}
      </span>
      <span className="relative block">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none flex items-center text-base">
          {icon}
        </span>
        <input
          {...rest}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={`field has-icon-left ${trailing ? "has-icon-right" : ""}`}
        />
        {trailing && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center text-base">
            {trailing}
          </span>
        )}
      </span>
    </label>
  );
}
