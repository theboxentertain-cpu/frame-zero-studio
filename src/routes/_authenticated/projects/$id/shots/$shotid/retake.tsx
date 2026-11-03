import { createFileRoute } from "@tanstack/react-router";
import { ProjectPage } from "@/features/ProjectPages";
export const Route = createFileRoute("/_authenticated/projects/$id/shots/$shotid/retake")({
  component: Page,
});
function Page() {
  const { id, shotid } = Route.useParams();
  return <ProjectPage pageId="P14" projectId={id} shotId={shotid} />;
}
