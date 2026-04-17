import { redirect } from "next/navigation";

import { CustomerAuthScreen } from "@/components/customer-auth-screen";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/");
  }

  return <CustomerAuthScreen initialMode="login" />;
}
