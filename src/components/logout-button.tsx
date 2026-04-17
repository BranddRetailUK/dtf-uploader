"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FiLogOut } from "react-icons/fi";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="secondary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      <FiLogOut className="size-4" />
      {pending ? "Signing out" : "Logout"}
    </button>
  );
}
