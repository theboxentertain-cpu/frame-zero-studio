import { createFileRoute } from "@tanstack/react-router";
import { ProjectPage } from "@/features/ProjectPages";
export const Route = createFileRoute("/_authenticated/projects/$id/quality")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return <ProjectPage pageId="P19" projectId={id} />;
}
