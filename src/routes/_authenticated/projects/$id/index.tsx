import { createFileRoute } from "@tanstack/react-router";
import { ProjectOverview } from "@/features/ProjectPages";
export const Route = createFileRoute("/_authenticated/projects/$id/")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return <ProjectOverview projectId={id} />;
}
