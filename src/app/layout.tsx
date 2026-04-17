import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth";

import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: {
    default: "DTF Uploader",
    template: "%s | DTF Uploader",
  },
  description:
    "Customer PDF upload workflow with Cloudinary storage, profile history, and an admin production inbox.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <div className="relative min-h-screen bg-white text-[#1c1c1c]">
          {user ? <SiteHeader user={user} /> : null}
          <main
            className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${
              user ? "max-w-7xl py-8" : "max-w-7xl py-0"
            }`}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
