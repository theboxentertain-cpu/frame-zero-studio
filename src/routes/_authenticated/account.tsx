import { createFileRoute } from "@tanstack/react-router";
import { Account } from "@/features/ProjectPages";
export const Route = createFileRoute("/_authenticated/account")({ component: Account });
