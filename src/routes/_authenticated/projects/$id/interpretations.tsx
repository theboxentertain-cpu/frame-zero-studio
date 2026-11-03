import { createFileRoute } from "@tanstack/react-router";
import { ProjectPage } from "@/features/ProjectPages";
export const Route = createFileRoute("/_authenticated/projects/$id/interpretations")({
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <ProjectPage pageId="P03" projectId={id} />;
}
