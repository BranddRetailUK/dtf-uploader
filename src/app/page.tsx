import type { Metadata } from "next";

import { PublicHomePage } from "@/components/public-home-page";
import { UploadStudio } from "@/components/upload-studio";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "DTF Transfer Printing",
  description:
    "Public DTF transfer upload service with bulk pricing based on combined metreage across every uploaded gang sheet.",
};

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    return <UploadStudio userId={user.id} />;
  }

  return <PublicHomePage />;
}
