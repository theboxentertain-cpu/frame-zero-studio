import { createFileRoute } from "@tanstack/react-router";
import { NewFilm } from "@/features/ProjectPages";
export const Route = createFileRoute("/_authenticated/projects/new")({ component: NewFilm });
