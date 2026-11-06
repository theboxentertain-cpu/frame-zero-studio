"""Preview or explicitly apply MIZENZA 0006 in the locked staging project only.

Preview runs real DDL inside a transaction and rolls it back. It never installs
changes. Apply requires workflow_dispatch on main plus an exact confirmation.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit, unquote

import psycopg

PROJECT_REF = "crvgvcokzryoxyvjkhxn"
SQL = Path("drizzle/migrations/0006_step15_approval_integrity.sql")
CONFIRMATION = "APPLY MIZENZA 0006 TO STAGING"


def stop(message: str) -> None:
    print(f"FAILED: {message}", file=sys.stderr)
    sys.exit(1)


def validate_configuration() -> tuple[str, str]:
    mode = os.environ.get("FZ_0006_MODE", "").strip().lower()
    event = os.environ.get("GITHUB_EVENT_NAME", "")
    branch = os.environ.get("GITHUB_REF", "")
    confirmation = os.environ.get("FZ_0006_CONFIRMATION", "")
    dsn = os.environ.get("STAGING_DATABASE_URL", "")
    if mode not in ("preview", "apply"):
        stop("Invalid mode; choose preview or apply.")
    if mode == "apply":
        if event != "workflow_dispatch" or branch != "refs/heads/main":
            stop("Apply is only permitted as a manual run from main.")
        if confirmation != CONFIRMATION:
            stop("Apply confirmation is missing or incorrect.")
    if not dsn or not SQL.is_file():
        stop("Staging database secret or migration file is missing.")
    try:
        parsed = urlsplit(dsn)
        host = (parsed.hostname or "").lower()
        username = unquote(parsed.username or "")
        password = unquote(parsed.password or "")
        port = parsed.port
    except ValueError:
        stop("Database URL could not be parsed.")
    if parsed.scheme not in ("postgresql", "postgres"):
        stop("Not a PostgreSQL URL.")
    if not host.endswith(".pooler.supabase.com") or port != 5432:
        stop("Expected a Supabase Session Pooler URL on port 5432.")
    if username != f"postgres.{PROJECT_REF}" or parsed.path != "/postgres":
        stop("Database URL is not for the locked MIZENZA staging project.")
    if not password or (password.startswith("[") and password.endswith("]")):
        stop("Database password is not configured.")
    return mode, dsn


def get_state(cursor: psycopg.Cursor) -> tuple[bool, bool, bool, bool, bool]:
    cursor.execute(
        """
        SELECT has_table_privilege('authenticated', 'public.storyboard_frames', 'INSERT'),
               has_column_privilege('authenticated', 'public.storyboard_frames', 'shot_id', 'INSERT'),
               has_table_privilege('authenticated', 'public.storyboard_frames', 'DELETE'),
               pg_get_functiondef('public.fz_attach_storyboard(uuid,integer,text,text,text)'::regprocedure)
                 LIKE '%shot_list_not_approved%',
               pg_get_functiondef('public.fz_review_storyboard(uuid,integer)'::regprocedure)
                 LIKE '%shot_list_not_approved%'
        """
    )
    return tuple(cursor.fetchone())


def main() -> None:
    mode, dsn = validate_configuration()
    connection = None
    in_transaction = False
    stage = "connect"
    try:
        connection = psycopg.connect(dsn, connect_timeout=15, sslmode="require", autocommit=True)
        with connection.cursor() as cursor:
            cursor.execute("BEGIN")
            in_transaction = True
            cursor.execute("SET LOCAL statement_timeout = '90s'")
            cursor.execute("SET LOCAL lock_timeout = '8s'")
            stage = "preflight"
            cursor.execute("SELECT current_database()")
            if cursor.fetchone()[0] != "postgres":
                raise ValueError("Unexpected database name.")
            cursor.execute(
                """SELECT to_regclass('public.projects'),
                          to_regclass('public.storyboard_frames'),
                          to_regprocedure('public.fz_save_storyboard(uuid,integer,jsonb)'),
                          to_regclass('storage.buckets')"""
            )
            if any(x is None for x in cursor.fetchone()):
                raise ValueError("Required existing staging schema (0000-0005) is incomplete.")
            cursor.execute("SELECT public FROM storage.buckets WHERE id='project-files'")
            bucket = cursor.fetchone()
            if bucket is None or bucket[0] is not False:
                raise ValueError("Expected the private project-files staging bucket.")
            before = get_state(cursor)
            print("Preflight: staging project, prior schema and private bucket verified.")
            print("Preflight: direct authenticated INSERT/DELETE or legacy RPC checks detected:",
                  before[:3], "updated attach/review:", before[3:])

            stage = "execute migration 0006"
            cursor.execute(SQL.read_text(encoding="utf-8"))

            stage = "post-migration security checks"
            after = get_state(cursor)
            if after != (False, False, False, True, True):
                raise ValueError("0006 did not enforce all expected grants and approval checks.")
            cursor.execute(
                """SELECT rowsecurity FROM pg_tables
                   WHERE schemaname='public' AND tablename='storyboard_frames'"""
            )
            row = cursor.fetchone()
            if row is None or row[0] is not True:
                raise ValueError("Storyboard owner RLS was not enabled.")
            cursor.execute(
                """SELECT count(*) FROM pg_policies
                   WHERE schemaname='public' AND tablename='storyboard_frames'"""
            )
            if cursor.fetchone()[0] < 4:
                raise ValueError("Expected storyboard RLS policies are missing.")
            if mode == "preview":
                cursor.execute("ROLLBACK")
                in_transaction = False
                print("SUCCESS: 0006 executed and security assertions passed on staging.")
                print("PREVIEW ONLY: Transaction rolled back. No changes installed.")
            else:
                cursor.execute("COMMIT")
                in_transaction = False
                print("SUCCESS: 0006 COMMITTED to verified MIZENZA staging only.")
                print("Lovable production untouched.")
    except (psycopg.Error, OSError, ValueError) as exc:
        if connection is not None and in_transaction:
            try:
                connection.execute("ROLLBACK")
            except psycopg.Error:
                pass
        # Never print the exception's connection string or arguments.
        category = getattr(exc, "sqlstate", None) or type(exc).__name__
        stop(f"{stage} failed ({category}). Transaction rollback attempted.")
    finally:
        if connection is not None:
            connection.close()


if __name__ == "__main__":
    main()
