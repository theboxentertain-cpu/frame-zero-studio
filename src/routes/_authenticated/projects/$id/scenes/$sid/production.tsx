import { createFileRoute } from "@tanstack/react-router";
import { ProjectPage } from "@/features/ProjectPages";
export const Route = createFileRoute("/_authenticated/projects/$id/scenes/$sid/production")({
  component: Page,
});
function Page() {
  const { id, sid } = Route.useParams();
  return <ProjectPage pageId="P13" projectId={id} sceneId={sid} />;
}
