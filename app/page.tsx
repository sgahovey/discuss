export default function Home() {
  return (
    <main className="page bg-flame relative overflow-hidden text-white">
      {/* Floating decorative ghosts */}
      <svg
        className="ghost absolute top-10 left-6 sm:top-16 sm:left-16 w-12 h-12 sm:w-20 sm:h-20 text-[#fffc00] opacity-30 pointer-events-none"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2c-3.86 0-7 3.14-7 7v6.5c0 .55.45 1 1 1h.5c.28 0 .5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5h6c.28 0 .5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5h.5c.55 0 1-.45 1-1V9c0-3.86-3.14-7-7-7Zm-2.5 8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
      </svg>
      <svg
        className="ghost absolute bottom-24 right-6 sm:bottom-32 sm:right-20 w-10 h-10 sm:w-16 sm:h-16 text-white opacity-25 pointer-events-none"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ animationDelay: "0.8s" }}
      >
        <path d="M12 2c-3.86 0-7 3.14-7 7v6.5c0 .55.45 1 1 1h.5c.28 0 .5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5h6c.28 0 .5.22.5.5v1c0 .28.22.5.5.5h1c.28 0 .5-.22.5-.5v-1c0-.28.22-.5.5-.5h.5c.55 0 1-.45 1-1V9c0-3.86-3.14-7-7-7Zm-2.5 8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
      </svg>

      <nav className="container-wide flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <span className="font-extrabold text-xl tracking-tight">Discuss</span>
        </div>
        <a
          href="/login"
          className="btn btn-ghost h-10 px-5 text-sm bg-white/15 backdrop-blur border-white/30 text-white hover:bg-white/25"
        >
          Connexion
        </a>
      </nav>

      <section className="container-wide flex-1 grid lg:grid-cols-2 items-center gap-10 lg:gap-16 py-10 sm:py-16">
        {/* Left: hero */}
        <div className="fade-up text-center lg:text-left">
          <span className="chip bg-white/20 text-white border-white/30 backdrop-blur">
            <span className="heart-beat">🔥</span> Nouveau
          </span>
          <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight">
            Discute.
            <br />
            <span className="text-[#fffc00] drop-shadow-[0_4px_22px_rgba(255,252,0,0.45)]">
              Match.
            </span>{" "}
            Vibre.
          </h1>
          <p className="mt-5 text-white/85 text-lg max-w-md mx-auto lg:mx-0">
            Une appli de chat lumineuse — la chaleur de Tinder, l&apos;énergie
            de Snapchat. Pensée pour les conversations qui comptent vraiment.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-center lg:justify-start">
            <a href="/register" className="btn btn-snap sm:px-8">
              Créer un compte
            </a>
            <a
              href="/login"
              className="btn btn-ghost bg-white/15 backdrop-blur border-white/30 text-white hover:bg-white/25"
            >
              J&apos;ai déjà un compte
            </a>
          </div>

          <div className="mt-8 flex items-center gap-4 justify-center lg:justify-start text-white/75 text-sm">
            <div className="flex -space-x-2">
              <span
                className="avatar w-8 h-8 text-xs"
                style={{
                  background:
                    "linear-gradient(135deg,#ff655b,#fd5068 60%,#ff8e9c)",
                  color: "white",
                }}
              >
                A
              </span>
              <span
                className="avatar w-8 h-8 text-xs"
                style={{
                  background:
                    "linear-gradient(135deg,#fffc00,#ffd166 60%,#ff8e3c)",
                }}
              >
                L
              </span>
              <span
                className="avatar w-8 h-8 text-xs"
                style={{
                  background:
                    "linear-gradient(135deg,#7b61ff,#ff5edf 60%,#ff655b)",
                  color: "white",
                }}
              >
                M
              </span>
            </div>
            <span>+12k personnes discutent déjà</span>
          </div>
        </div>

        {/* Right: floating preview cards (decorative) */}
        <div className="relative hidden lg:block h-[520px] fade-up">
          <div
            className="float-card tilt-l drift absolute top-4 left-2 w-64 p-5 text-ink"
            style={{ ["--rot" as string]: "-6deg" }}
          >
            <div className="flex items-center gap-2">
              <div className="avatar w-9 h-9 text-sm">S</div>
              <div>
                <p className="font-bold text-sm">Sasha · 24</p>
                <p className="text-[11px] text-muted">à 1 km</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="bubble bubble-other text-sm">
                Salut 👋 t&apos;es plutôt sushi ou ramen ?
              </div>
              <div className="bubble bubble-own ml-auto text-sm">
                Ramen, always.
              </div>
            </div>
          </div>

          <div
            className="float-card tilt-r drift absolute bottom-2 right-2 w-72 p-5 text-ink"
            style={{ ["--rot" as string]: "7deg", animationDelay: "1.2s" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="avatar w-9 h-9 text-sm"
                  style={{
                    background:
                      "linear-gradient(135deg,#7b61ff,#ff5edf 60%,#ff655b)",
                    color: "white",
                  }}
                >
                  L
                </div>
                <div>
                  <p className="font-bold text-sm">Léa · 22</p>
                  <p className="text-[11px] text-muted">en ligne</p>
                </div>
              </div>
              <span className="chip text-[10px] py-1">match</span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="bubble bubble-other text-sm">
                On se voit ce week-end ?
              </div>
              <div className="bubble bubble-own ml-auto text-sm">
                Avec plaisir <span className="heart-beat">❤️</span>
              </div>
            </div>
          </div>

          <div
            className="float-card drift absolute top-32 right-16 w-44 p-3"
            style={{ ["--rot" as string]: "3deg", animationDelay: "0.6s" }}
          >
            <div
              className="h-32 rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg,#fffc00,#ff8e3c 60%,#fd5068)",
              }}
            />
            <p className="mt-2 font-bold text-sm text-ink">Story du jour</p>
            <p className="text-[11px] text-muted">il y a 2 min</p>
          </div>
        </div>
      </section>

      <footer className="container-wide py-6 text-center lg:text-left text-white/70 text-xs">
        Made with <span className="heart-beat">❤️</span> & ✨ —{" "}
        <a href="/register" className="underline font-semibold">
          rejoins-nous pour + d'aventures
        </a>
      </footer>
    </main>
  );
}
