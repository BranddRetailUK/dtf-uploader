import { AuthForm } from "@/components/auth-form";
import { LamiLogo } from "@/components/lami-logo";

export function CustomerAuthScreen({
  initialMode,
}: {
  initialMode: "signup" | "login";
}) {
  return (
    <section className="flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center gap-10 py-10">
      <div>
        <LamiLogo width={200} priority />
      </div>

      <div className="w-full">
        <AuthForm mode={initialMode} />
      </div>
    </section>
  );
}
