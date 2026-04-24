import type { Metadata } from "next";

import { PublicHomePage } from "@/components/public-home-page";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "DTF Transfer Printing",
  description:
    "Public DTF transfer upload service with bulk pricing based on combined metreage across every uploaded gang sheet.",
};

export default async function PublicHomeRoute() {
  const user = await getCurrentUser();

  return <PublicHomePage isSignedIn={Boolean(user)} />;
}
