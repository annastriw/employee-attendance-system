export type SkeletonShape = "line" | "block" | "circle";

/**
 * Shape-matching skeleton placeholder for loading states.
 * Prefer skeletons shaped like the final content over generic spinners.
 */
export function Skeleton({
  shape = "line",
  width,
  height,
  className = "",
}: {
  shape?: SkeletonShape;
  width?: string | number;
  height?: string | number;
  className?: string;
}) {
  return (
    <span
      className={["skeleton", `skeleton--${shape}`, className]
        .filter(Boolean)
        .join(" ")}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
