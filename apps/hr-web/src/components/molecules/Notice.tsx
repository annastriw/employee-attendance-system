export function Notice({
  message,
  success = false,
}: {
  message: string;
  success?: boolean;
}) {
  return (
    <div
      className={`notice ${success ? "notice-success" : "notice-error"}`}
      role={success ? "status" : "alert"}
    >
      <span aria-hidden="true">{success ? "✓" : "!"}</span>
      <p>{message}</p>
    </div>
  );
}
