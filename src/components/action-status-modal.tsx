import { FiCheck, FiLoader } from "react-icons/fi";

export function ActionStatusModal({
  phase,
  loadingTitle,
  loadingMessage,
  successTitle,
  successMessage,
}: {
  phase: "uploading" | "success";
  loadingTitle: string;
  loadingMessage: string;
  successTitle: string;
  successMessage: string;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(28,28,28,0.16)] px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[2rem] border border-[#7e00ff]/16 bg-white p-8 text-center shadow-[0_30px_90px_rgba(28,28,28,0.14)]">
        <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-[#f4ebff]">
          {phase === "uploading" ? (
            <FiLoader className="size-10 animate-spin text-[#7e00ff]" />
          ) : (
            <FiCheck className="size-10 text-emerald-500" />
          )}
        </div>
        <h2 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">
          {phase === "uploading" ? loadingTitle : successTitle}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#666666]">
          {phase === "uploading" ? loadingMessage : successMessage}
        </p>
      </div>
    </div>
  );
}
