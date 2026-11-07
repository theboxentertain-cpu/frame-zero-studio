"""Run MIZENZA ACL candidates 0007–0008 in staging and ALWAYS ROLLBACK.

No apply path, no user-data reads, no secrets logged, no production target.
This workflow verifies execution against the explicitly locked staging DB.
"""
from __future__ import annotations

import hashlib
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit, unquote

import psycopg

STAGING_REF = "crvgvcokzryoxyvjkhxn"
SQL_FILES = [
    Path("drizzle/migrations/0007_revision_acl_hardening.sql"),
    Path("drizzle/migrations/0008_privileged_table_access_lockdown.sql"),
]


def stop(step: str, error: Exception) -> None:
    sql_state = getattr(error, "sqlstate", None)
    category = sql_state or type(error).__name__
    print(f"FAILED during {step} ({category}); rollback required.", file=sys.stderr)
    sys.exit(1)


def connection_string() -> str:
    dsn = os.environ.get("STAGING_DATABASE_URL", "")
    if not dsn or not all(p.is_file() for p in SQL_FILES):
        raise ValueError("Missing staging secret or SQL file.")
    parsed = urlsplit(dsn)
    host = (parsed.hostname or "").lower()
    username = unquote(parsed.username or "")
    if parsed.scheme not in ("postgres", "postgresql"):
        raise ValueError("Invalid database scheme.")
    if not host.endswith(".pooler.supabase.com") or parsed.port != 5432:
        raise ValueError("Only the dedicated Supabase Session Pooler is allowed.")
    if username != "postgres." + STAGING_REF or parsed.path != "/postgres":
        raise ValueError("Database identity is not the locked MIZENZA staging project.")
    if not unquote(parsed.password or ""):
        raise ValueError("Empty staging password.")
    if os.environ.get("GITHUB_REF") != "refs/heads/security/staging-acl-rollback-preview-20261107":
        raise ValueError("Preview must run on its dedicated review branch.")
    return dsn


def grant_state(cur: psycopg.Cursor) -> list[tuple]:
    cur.execute(
        """SELECT c.relname,
                  has_table_privilege('authenticated',c.oid,'TRUNCATE'),
                  has_table_privilege('anon',c.oid,'TRUNCATE'),
                  has_table_privilege('authenticated',c.oid,'INSERT'),
                  has_table_privilege('authenticated',c.oid,'UPDATE'),
                  has_table_privilege('authenticated',c.oid,'DELETE'),
                  has_table_privilege('anon',c.oid,'INSERT'),
                  has_table_privilege('anon',c.oid,'UPDATE'),
                  has_table_privilege('anon',c.oid,'DELETE')
           FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relkind IN ('r','p')
           ORDER BY c.relname"""
    )
    return list(cur.fetchall())


def main() -> None:
    conn = None
    active = False
    stage = "staging configuration"
    try:
        dsn = connection_string()
        conn = psycopg.connect(dsn, connect_timeout=15, sslmode="require", autocommit=True)
        with conn.cursor() as cur:
            cur.execute("BEGIN")
            active = True
            cur.execute("SET LOCAL statement_timeout = '60s'")
            cur.execute("SET LOCAL lock_timeout = '5s'")
            cur.execute("SELECT current_database()")
            if cur.fetchone()[0] != "postgres":
                raise ValueError("Unexpected database name.")
            stage = "staging prerequisites"
            cur.execute(
                """SELECT to_regclass('public.storyboard_frames') IS NOT NULL,
                          to_regprocedure('public.fz_save_brief_revision(uuid,text)') IS NOT NULL,
                          (SELECT p.prosecdef FROM pg_proc p WHERE p.oid=
                             to_regprocedure('public.fz_save_brief_revision(uuid,text)')),
                          (SELECT public FROM storage.buckets WHERE id='project-files')"""
            )
            prerequisites = tuple(cur.fetchone())
            if prerequisites != (True, True, True, False):
                raise ValueError("Missing expected schema, secure revision RPC or private bucket.")
            before = grant_state(cur)
            if len(before) != 20:
                raise ValueError("Expected exactly 20 public app tables; re-review schema.")
            print("Verified dedicated staging identity, 20 tables, revision RPC and private storage.")
            for file in SQL_FILES:
                stage = file.name
                raw = file.read_text(encoding="utf-8")
                print(f"Previewing {file.name} sha256={hashlib.sha256(raw.encode()).hexdigest()[:16]}")
                cur.execute(raw)

            stage = "assert ACL hardening"
            after = grant_state(cur)
            if len(after) != 20 or any(row[1] or row[2] for row in after):
                raise ValueError("Some anonymous or signed-in roles retain TRUNCATE.")
            storyboard = next((row for row in after if row[0] == "storyboard_frames"), None)
            if storyboard is None or any(storyboard[3:]):
                raise ValueError("Storyboard still allows direct role writes.")
            cur.execute(
                """SELECT
                  has_table_privilege('authenticated','public.brief_revisions','INSERT'),
                  has_table_privilege('authenticated','public.brief_revisions','TRUNCATE'),
                  has_column_privilege('authenticated','public.briefs','current_revision','UPDATE'),
                  has_column_privilege('authenticated','public.briefs','notes','UPDATE'),
                  has_table_privilege('authenticated','public.storyboard_frames','SELECT')"""
            )
            if tuple(cur.fetchone()) != (False, False, False, True, True):
                raise ValueError("Immutable revision or storyboard read grants invalid.")
            print("PASS: 0007–0008 SQL and ACL/security assertions inside temporary transaction.")

            stage = "mandatory transaction rollback"
            cur.execute("ROLLBACK")
            active = False
            if grant_state(cur) != before:
                raise ValueError("Rollback did not restore the initial table grants.")
            print("PASS: ROLLBACK verified. No SQL migrations installed in staging.")
            print("Lovable production was never connected.")
    except (psycopg.Error, OSError, ValueError) as error:
        if active and conn is not None:
            try:
                conn.execute("ROLLBACK")
                active = False
            except psycopg.Error:
                pass
        stop(stage, error)
    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    main()
