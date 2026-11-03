import { createFileRoute } from "@tanstack/react-router";
import { ProjectPage } from "@/features/ProjectPages";
export const Route = createFileRoute("/_authenticated/projects/$id/scenes/$sid/plan")({
  component: Page,
});
function Page() {
  const { id, sid } = Route.useParams();
  return <ProjectPage pageId="P11" projectId={id} sceneId={sid} />;
}
