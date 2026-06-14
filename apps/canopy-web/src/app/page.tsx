import { CanopyDashboard } from "../components/canopy-dashboard";
import { getCanopyWebModel } from "../lib/canopy-data";

export default function Home() {
  const model = getCanopyWebModel();

  return <CanopyDashboard model={model} />;
}
