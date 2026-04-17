import { CustomerAuthScreen } from "@/components/customer-auth-screen";
import { UploadStudio } from "@/components/upload-studio";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    return <UploadStudio userId={user.id} />;
  }

  return <CustomerAuthScreen initialMode="signup" />;
}
