import Link from "next/link";
import { FiLayers, FiShield, FiUser } from "react-icons/fi";

import { LamiLogo } from "@/components/lami-logo";
import type { AuthUser } from "@/lib/auth";

const HEADER_LOGO_URL =
  "https://res.cloudinary.com/dhlqooyuk/image/upload/v1776410659/lami_logo_vlbdbk.png";

export function SiteHeader({ user }: { user: AuthUser }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#1c1c1c]/8 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <Link href="/" className="inline-flex items-center">
              <LamiLogo width={148} src={HEADER_LOGO_URL} />
            </Link>

            <nav className="flex flex-wrap items-center gap-2 text-sm">
              <Link
                href="/"
                className="secondary-button px-3.5 py-2"
              >
                Upload
              </Link>
              <Link
                href="/layout"
                className="secondary-button px-3.5 py-2"
              >
                <FiLayers className="size-4" />
                Layout v2
              </Link>
              {user.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  className="secondary-button px-3.5 py-2"
                >
                  <FiShield className="size-4" />
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>

          <Link
            href="/profile"
            aria-label="Profile"
            title="Profile"
            className="secondary-button inline-flex size-11 items-center justify-center self-start p-0 sm:self-auto"
          >
            <FiUser className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
