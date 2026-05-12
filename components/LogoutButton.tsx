"use client";

import { authClient } from "@/lib/auth-clients";
import { useRouter } from "next/navigation";
import { FaSignOutAlt } from "react-icons/fa";

export default function LogoutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="btn btn-ghost h-10 px-4 text-sm"
      aria-label="Se déconnecter"
    >
      <FaSignOutAlt className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Déconnexion</span>
    </button>
  );
}
