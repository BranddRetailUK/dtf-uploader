import Link from "next/link";
import {
  FiArrowRight,
  FiCheckCircle,
  FiFileText,
  FiLayers,
  FiPackage,
  FiUploadCloud,
} from "react-icons/fi";

import { LamiLogo } from "@/components/lami-logo";

const heroStats = [
  "10 x 1m files count as 10m",
  "Bulk rate across the whole basket",
  "No artwork repacking required",
];

const benefits = [
  {
    title: "Bulk discount across every upload",
    description:
      "Upload any mix of metre gang sheets. We combine the full metreage in the order before pricing, so separate files still earn the right volume rate.",
    icon: FiLayers,
  },
  {
    title: "No single-file penalty",
    description:
      "Many DTF uploaders only reward one long gang sheet. Lami is built for the real workflow: several customer jobs, several files, one combined print run.",
    icon: FiFileText,
  },
  {
    title: "Ready for repeat orders",
    description:
      "Keep artwork uploads, generated layouts, order totals, and file statuses in one account so every run is easy to send and track.",
    icon: FiPackage,
  },
];

const steps = [
  "Upload your gang sheets individually or create a layout online.",
  "We add the metreage together across the whole order.",
  "Your files move into production with order tracking in your profile.",
];

function HeroScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#f8f7fb]" />
      <div className="absolute inset-0 bg-white/70" />

      <div className="absolute right-[-8rem] top-10 hidden h-[42rem] w-[29rem] rotate-6 rounded-[1.8rem] border border-[#1c1c1c]/10 bg-white/88 p-5 shadow-[0_28px_80px_rgba(28,28,28,0.12)] lg:block">
        <div className="flex h-full flex-col gap-4 rounded-[1.2rem] border border-dashed border-[#1c1c1c]/18 bg-[#fbfbfb] p-4">
          <div className="h-8 rounded-full bg-[#1c1c1c]" />
          <div className="grid flex-1 grid-cols-3 gap-3">
            <div className="rounded-[1rem] bg-[#7e00ff]" />
            <div className="rounded-[1rem] bg-[#00a676]" />
            <div className="rounded-[1rem] bg-[#ffb020]" />
            <div className="col-span-2 rounded-[1rem] bg-[#1c1c1c]" />
            <div className="rounded-[1rem] bg-[#ef476f]" />
            <div className="rounded-[1rem] bg-[#2ec4b6]" />
            <div className="rounded-[1rem] bg-[#7e00ff]" />
            <div className="rounded-[1rem] bg-[#ffb020]" />
            <div className="col-span-3 rounded-[1rem] bg-[#f4ebff]" />
          </div>
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#666666]">
            <span>1m sheet</span>
            <span>Print ready</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-[-8rem] left-[-4rem] h-[24rem] w-[18rem] -rotate-6 rounded-[1.7rem] border border-[#1c1c1c]/10 bg-white/82 p-4 shadow-[0_24px_70px_rgba(28,28,28,0.1)]">
        <div className="grid h-full grid-cols-2 gap-3 rounded-[1.1rem] border border-dashed border-[#1c1c1c]/16 bg-[#fbfbfb] p-3">
          <div className="rounded-[0.9rem] bg-[#7e00ff]" />
          <div className="rounded-[0.9rem] bg-[#1c1c1c]" />
          <div className="col-span-2 rounded-[0.9rem] bg-[#00a676]" />
          <div className="rounded-[0.9rem] bg-[#ffb020]" />
          <div className="rounded-[0.9rem] bg-[#ef476f]" />
        </div>
      </div>

      <div className="absolute bottom-12 right-10 hidden rounded-full border border-[#7e00ff]/18 bg-white/90 px-5 py-3 text-sm font-semibold text-[#1c1c1c] shadow-[0_18px_48px_rgba(28,28,28,0.1)] md:block">
        Combined metreage pricing
      </div>
    </div>
  );
}

export function PublicHomePage({
  isSignedIn = false,
}: {
  isSignedIn?: boolean;
}) {
  const primaryHeroCta = isSignedIn
    ? {
        href: "/",
        label: "Upload artwork",
        icon: <FiUploadCloud className="size-4" />,
      }
    : {
        href: "/signup",
        label: "Create an account",
        icon: <FiUploadCloud className="size-4" />,
      };
  const secondaryHeroCta = isSignedIn
    ? {
        href: "/layout",
        label: "Create layout",
      }
    : {
        href: "/login",
        label: "Login to upload",
      };
  const footerCta = isSignedIn
    ? {
        href: "/",
        label: "Upload files",
      }
    : {
        href: "/signup",
        label: "Create account",
      };

  return (
    <div className="pb-16">
      <section className="relative left-1/2 min-h-[74svh] w-screen -translate-x-1/2 overflow-hidden">
        <HeroScene />

        <div className="relative z-10 mx-auto flex min-h-[74svh] max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
          {isSignedIn ? null : (
            <nav className="flex items-center justify-between gap-4">
              <Link href="/" aria-label="Lami home" className="inline-flex">
                <span className="sm:hidden">
                  <LamiLogo width={112} priority />
                </span>
                <span className="hidden sm:inline-flex">
                  <LamiLogo width={148} priority />
                </span>
              </Link>

              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="secondary-button px-3 py-2.5 text-sm sm:px-4"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="primary-button px-3 py-2.5 text-sm sm:px-4"
                >
                  <span>
                    Start<span className="hidden sm:inline"> upload</span>
                  </span>
                  <FiArrowRight className="size-4" />
                </Link>
              </div>
            </nav>
          )}

          <div className="flex flex-1 items-center py-12">
            <div className="max-w-3xl">
              <p className="eyebrow">DTF transfer printing</p>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-[#1c1c1c] sm:text-5xl lg:text-6xl">
                Bulk DTF transfers priced by total metreage
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#4f4f4f] sm:text-lg">
                Upload every metre gang sheet separately if that is how you work.
                We total the full run before pricing, so the bulk discount follows
                your whole basket.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={primaryHeroCta.href}
                  className="primary-button px-6 py-3.5 text-sm"
                >
                  {primaryHeroCta.label}
                  {primaryHeroCta.icon}
                </Link>
                <Link
                  href={secondaryHeroCta.href}
                  className="secondary-button px-6 py-3.5 text-sm"
                >
                  {secondaryHeroCta.label}
                </Link>
              </div>

              <div className="mt-9 hidden max-w-3xl gap-3 md:grid md:grid-cols-3">
                {heroStats.map((stat) => (
                  <div
                    key={stat}
                    className="flex items-center gap-3 rounded-[1.3rem] border border-[#1c1c1c]/8 bg-white/86 px-4 py-3 text-sm font-medium text-[#1c1c1c] shadow-[0_16px_42px_rgba(28,28,28,0.06)]"
                  >
                    <FiCheckCircle className="size-4 shrink-0 text-[#7e00ff]" />
                    <span>{stat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="eyebrow">Why Lami</p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight text-[#1c1c1c] sm:text-4xl">
              Built for the way decorators actually send DTF work
            </h2>
          </div>
          <p className="text-sm leading-7 text-[#666666] sm:text-base">
            Keep your files organised without losing the value of a larger print
            run. Whether the order is one gang sheet or forty, the important number
            is the combined metreage.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article
                key={benefit.title}
                className="rounded-[2rem] border border-[#7e00ff]/14 bg-white p-6 shadow-[0_20px_56px_rgba(28,28,28,0.06)]"
              >
                <div className="flex size-12 items-center justify-center rounded-[1.1rem] bg-[#f4ebff] text-[#7e00ff]">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#1c1c1c]">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#666666]">
                  {benefit.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl border-y border-[#1c1c1c]/8 py-12">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#1c1c1c]">
              One simple upload flow
            </h2>
          </div>

          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-[1.6rem] border border-[#1c1c1c]/8 bg-[#fafafa] px-5 py-4"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#7e00ff] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <p className="pt-1 text-sm leading-7 text-[#4f4f4f] sm:text-base">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl">
        <div className="flex flex-col gap-5 rounded-[2rem] border border-[#7e00ff]/14 bg-[#faf8ff] p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Start now</p>
            <h2 className="mt-3 text-2xl font-semibold text-[#1c1c1c]">
              Send your next DTF run with combined metreage pricing.
            </h2>
          </div>
          <Link href={footerCta.href} className="primary-button px-6 py-3.5 text-sm">
            {footerCta.label}
            <FiArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
