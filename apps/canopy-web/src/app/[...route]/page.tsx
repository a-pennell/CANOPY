import { CanopyPage } from "../canopy-page";

export default async function RoutedShell({
  params,
  searchParams
}: {
  readonly params: Promise<{ readonly route: readonly string[] }>;
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;

  return (
    <CanopyPage
      routeSegments={resolvedParams.route}
      searchParams={searchParams}
    />
  );
}
