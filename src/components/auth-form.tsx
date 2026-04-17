"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FiArrowRight, FiLock } from "react-icons/fi";

type AuthMode = "signup" | "login" | "admin";
type CustomerMode = "signup" | "login";

const modeConfig: Record<
  AuthMode,
  {
    title: string;
    description: string;
    endpoint: string;
    submitLabel: string;
    successPath: string;
  }
> = {
  signup: {
    title: "Create your account",
    description:
      "Sign up to upload your PDF files, track previous orders, and keep everything in one place.",
    endpoint: "/api/auth/signup",
    submitLabel: "Create account",
    successPath: "/",
  },
  login: {
    title: "Welcome back",
    description:
      "Log in to upload more artwork, review past uploads, and check order totals.",
    endpoint: "/api/auth/login",
    submitLabel: "Login",
    successPath: "/",
  },
  admin: {
    title: "Staff login",
    description: "Sign in with an admin account to manage customer uploads.",
    endpoint: "/api/auth/login",
    submitLabel: "Login",
    successPath: "/admin",
  },
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<CustomerMode>(
    mode === "login" ? "login" : "signup",
  );
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    password: "",
  });

  const currentMode: AuthMode = mode === "admin" ? "admin" : activeMode;
  const config = modeConfig[currentMode];
  const showProfileFields = currentMode === "signup";
  const showCustomerSwitch = mode !== "admin";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const body =
      currentMode === "signup"
        ? {
            firstName: form.firstName,
            lastName: form.lastName,
            companyName: form.companyName,
            email: form.email,
            password: form.password,
          }
        : {
            email: form.email,
            password: form.password,
            adminOnly: currentMode === "admin",
          };

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "We couldn't complete that request.");
      return;
    }

    startTransition(() => {
      router.push(config.successPath);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-[32rem] rounded-[2rem] border border-[#7e00ff]/14 bg-white p-8 shadow-[0_24px_70px_rgba(28,28,28,0.08)] sm:p-10">
      {showCustomerSwitch ? (
        <div className="grid grid-cols-2 rounded-full bg-[#f6f0ff] p-1">
          <button
            type="button"
            onClick={() => {
              setActiveMode("signup");
              setError(null);
            }}
            className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
              activeMode === "signup"
                ? "bg-[#7e00ff] text-white shadow-[0_14px_28px_rgba(126,0,255,0.2)]"
                : "text-[#5f5f5f]"
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode("login");
              setError(null);
            }}
            className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
              activeMode === "login"
                ? "bg-[#7e00ff] text-white shadow-[0_14px_28px_rgba(126,0,255,0.2)]"
                : "text-[#5f5f5f]"
            }`}
          >
            Login
          </button>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 rounded-full bg-[#f6f0ff] px-4 py-2 text-sm font-semibold text-[#7e00ff]">
          <FiLock className="size-4" />
          Staff login
        </div>
      )}

      <div className="mt-6">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#1c1c1c] sm:text-4xl">
          {config.title}
        </h1>
        <p className="mt-3 text-sm leading-7 text-[#666666]">
          {config.description}
        </p>
      </div>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {showProfileFields ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="field-shell">
              <span className="field-label">First name</span>
              <input
                className="field-input"
                value={form.firstName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    firstName: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field-shell">
              <span className="field-label">Last name</span>
              <input
                className="field-input"
                value={form.lastName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lastName: event.target.value,
                  }))
                }
                required
              />
            </label>
          </div>
        ) : null}

        {showProfileFields ? (
          <label className="field-shell">
            <span className="field-label">Company name</span>
            <input
              className="field-input"
              value={form.companyName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  companyName: event.target.value,
                }))
              }
              required
            />
          </label>
        ) : null}

        <label className="field-shell">
          <span className="field-label">Email address</span>
          <input
            type="email"
            className="field-input"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            required
          />
        </label>

        <label className="field-shell">
          <span className="field-label">Password</span>
          <input
            type="password"
            className="field-input"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            required
            minLength={8}
          />
        </label>

        {error ? (
          <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="primary-button w-full px-5 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Please wait..." : config.submitLabel}
          <FiArrowRight className="size-4" />
        </button>
      </form>

      {mode === "admin" ? (
        <div className="mt-6 text-center text-sm text-[#666666]">
          <Link href="/" className="font-medium text-[#7e00ff] hover:underline">
            Back to customer sign in
          </Link>
        </div>
      ) : (
        <p className="mt-6 text-center text-sm leading-6 text-[#666666]">
          Upload your PDF files, review previous orders, and keep each job tied to
          your account.
        </p>
      )}
    </div>
  );
}
