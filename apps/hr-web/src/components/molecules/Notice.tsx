import { CheckCircle, WarningCircle } from "@phosphor-icons/react";

export function Notice({
  message,
  success = false,
}: {
  message: string;
  success?: boolean;
}) {
  const Icon = success ? CheckCircle : WarningCircle;
  return (
    <div
      className={`notice ${success ? "notice-success" : "notice-error"}`}
      role={success ? "status" : "alert"}
    >
      <Icon size={16} weight="fill" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
