export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authentication is handled by middleware
  return <>{children}</>;
}