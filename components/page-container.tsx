/**
 * Standard page wrapper so max-widths stay consistent across the app.
 * `page` for content/reading pages, `wide` for table/list-heavy pages.
 */
export function PageContainer({
  width = "page",
  className = "",
  children,
}: {
  width?: "page" | "wide";
  className?: string;
  children: React.ReactNode;
}) {
  const max = width === "wide" ? "max-w-[1280px]" : "max-w-[1100px]";
  return (
    <div className={`mx-auto w-full ${max} px-6 py-8 ${className}`}>
      {children}
    </div>
  );
}
