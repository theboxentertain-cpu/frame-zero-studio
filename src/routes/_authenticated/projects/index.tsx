import { createFileRoute } from "@tanstack/react-router";
import { ProjectLibrary } from "@/features/ProjectPages";
export const Route = createFileRoute("/_authenticated/projects/")({ component: ProjectLibrary });
