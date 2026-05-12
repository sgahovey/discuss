"use client";

import { authClient } from "@/lib/auth-clients";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return <button onClick={handleSignOut}>Se deconnecter</button>;
}