import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h2>404 Not Found</h2>
      <p>Page non trouvee</p>
      <Link href="/">Retourner a l'accueil</Link>
    </div>
  );
}