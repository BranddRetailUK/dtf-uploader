import { redirect } from "next/navigation";

import { CustomerAuthScreen } from "@/components/customer-auth-screen";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return <CustomerAuthScreen initialMode="signup" />;
}
