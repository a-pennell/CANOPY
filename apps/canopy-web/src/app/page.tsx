import { CanopyPage } from "./canopy-page";

export default function Home({
  searchParams
}: {
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CanopyPage searchParams={searchParams} />;
}
