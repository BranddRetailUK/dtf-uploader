import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLoginPage() {
  const user = await getCurrentUser();

  if (user?.role === "ADMIN") {
    redirect("/admin");
  }

  if (user) {
    redirect("/");
  }

  return (
    <section className="flex min-h-[calc(100vh-2rem)] items-center justify-center">
      <AuthForm mode="admin" />
    </section>
  );
}
