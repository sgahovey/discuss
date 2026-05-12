import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page bg-flame flex flex-col items-center justify-center p-8 text-white text-center">
      <div className="fade-up max-w-lg">
        <p className="text-8xl sm:text-9xl font-black mb-3 drop-shadow tracking-tight">
          404
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold mb-2">
          Page envolée <span className="inline-block">👻</span>
        </h2>
        <p className="text-white/85 text-base sm:text-lg">
          Cette page n&apos;existe pas (ou plus). Pas grave, ça arrive aux
          meilleurs.
        </p>
        <Link href="/" className="btn btn-snap mt-8 inline-flex sm:px-8">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
