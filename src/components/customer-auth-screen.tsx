import { AuthForm } from "@/components/auth-form";
import { LamiLogo } from "@/components/lami-logo";

export function CustomerAuthScreen({
  initialMode,
}: {
  initialMode: "signup" | "login";
}) {
  return (
    <section className="grid min-h-[calc(100vh-2rem)] grid-rows-[minmax(2.5rem,1fr)_auto_minmax(2.5rem,1fr)_auto_minmax(2.5rem,1fr)] items-center">
      <div className="row-start-2 justify-self-center">
        <LamiLogo width={200} priority />
      </div>

      <div className="row-start-4 w-full justify-self-center">
        <AuthForm mode={initialMode} />
      </div>
    </section>
  );
}
