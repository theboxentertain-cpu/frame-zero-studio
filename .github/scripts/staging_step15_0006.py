"""MIZENZA Step 15: apply only migration 0006 to the dedicated staging DB.

No production credentials or service-role keys. Preview executes in a transaction
and rolls back. Apply requires explicit workflow confirmation. Never replay 0000–0005.
"""
import os
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

import psycopg

REF = "crvgvcokzryoxyvjkhxn"
MIGRATION = Path("drizzle/migrations/0006_step15_approval_integrity.sql")
CONFIRM = "APPLY MIZENZA STAGING 0006"


def fail(message: str) -> None:
    print("FAILED: " + message, file=sys.stderr)
    sys.exit(1)


def assert_safe_target(dsn: str) -> None:
    try:
        u = urlsplit(dsn)
        valid = (
            u.scheme in {"postgresql", "postgres"}
            and (u.hostname or "").endswith(".pooler.supabase.com")
            and u.port == 5432
            and u.path == "/postgres"
            and unquote(u.username or "") == "postgres." + REF
            and bool(unquote(u.password or ""))
            and not unquote(u.password or "").startswith("[")
        )
    except ValueError:
        valid = False
    if not valid:
        fail("Only the known FRAME ZERO/MIZENZA STAGING Session Pooler is allowed.")


def permissions(cur) -> tuple[bool, bool, bool]:
    cur.execute(
        """
        SELECT
          has_table_privilege('authenticated','public.storyboard_frames','INSERT'),
          has_column_privilege('authenticated','public.storyboard_frames','project_id','INSERT'),
          has_table_privilege('authenticated','public.storyboard_frames','DELETE')
        """
    )
    return tuple(bool(v) for v in cur.fetchone())


def gate_functions_enforced(cur) -> bool:
    cur.execute(
        """
        SELECT
          pg_get_functiondef('public.fz_attach_storyboard(uuid,integer,text,text,text)'::regprocedure),
          pg_get_functiondef('public.fz_review_storyboard(uuid,integer)'::regprocedure)
        """
    )
    attach_sql, review_sql = cur.fetchone()
    return all(
        "shot_list_not_approved" in source and "fz_gate_status" in source
        for source in (attach_sql, review_sql)
    )


def main() -> None:
    mode = os.getenv("MIZENZA_MIGRATION_MODE", "")
    confirmation = os.getenv("MIZENZA_MIGRATION_CONFIRMATION", "")
    dsn = os.getenv("STAGING_DATABASE_URL", "")
    if mode not in ("preview", "apply"):
        fail("Only preview/apply modes are supported.")
    if mode == "apply" and confirmation != CONFIRM:
        fail("Apply requires exact typed confirmation: " + CONFIRM)
    if not dsn:
        fail("STAGING_DATABASE_URL secret is absent.")
    assert_safe_target(dsn)
    if not MIGRATION.is_file():
        fail("Migration 0006 file is missing.")

    conn = None
    transaction_open = False
    try:
        conn = psycopg.connect(dsn, connect_timeout=15, sslmode="require", autocommit=True)
        with conn.cursor() as cur:
            cur.execute("BEGIN")
            transaction_open = True
            cur.execute("SET LOCAL lock_timeout = '8s'")
            cur.execute("SET LOCAL statement_timeout = '75s'")
            cur.execute(
                """
                SELECT current_database(),to_regclass('public.storyboard_frames'),
                  to_regclass('public.projects'),
                  (SELECT rowsecurity FROM pg_tables
                   WHERE schemaname='public' AND tablename='storyboard_frames'),
                  (SELECT public FROM storage.buckets WHERE id='project-files')
                """
            )
            db_name, frames_table, projects_table, row_security, bucket_public = cur.fetchone()
            if (
                db_name != "postgres"
                or frames_table is None
                or projects_table is None
                or row_security is not True
                or bucket_public is not False
            ):
                raise ValueError("Expected private Step 15 staging schema/bucket not found.")

            before = permissions(cur)
            already_hardened = not any(before) and gate_functions_enforced(cur)
            if already_hardened:
                cur.execute("ROLLBACK")
                transaction_open = False
                print("SUCCESS: Migration 0006 appears already applied. No write attempted.")
                return
            if not any(before):
                raise ValueError(
                    "Privileges are already restricted but RPC verification fails; manual audit required."
                )

            print("Verified known staging identity, existing Step 15 tables and private bucket.")
            cur.execute(MIGRATION.read_text(encoding="utf-8"))

            after = permissions(cur)
            if any(after):
                raise ValueError("Direct storyboard INSERT or DELETE privileges remain.")
            if not gate_functions_enforced(cur):
                raise ValueError("The attach/review RPCs do not enforce current shot approval.")
            cur.execute(
                """
                SELECT has_function_privilege(
                  'authenticated',
                  'public.fz_prepare_storyboard(uuid)','EXECUTE'
                ), has_function_privilege(
                  'authenticated',
                  'public.fz_save_storyboard(uuid,integer,jsonb)','EXECUTE'
                )
                """
            )
            if not all(cur.fetchone()):
                raise ValueError("Owner-facing storyboard RPC permissions are missing.")

            if mode == "preview":
                cur.execute("ROLLBACK")
                transaction_open = False
                print("SUCCESS: Migration 0006 preview validated and ROLLED BACK.")
                print("No staging schema change has been committed.")
            else:
                cur.execute("COMMIT")
                transaction_open = False
                print("SUCCESS: Migration 0006 COMMITTED to the known staging project only.")
                print("Lovable production database was not contacted.")
    except (psycopg.Error, ValueError, OSError) as exc:
        if conn is not None and transaction_open:
            try:
                conn.execute("ROLLBACK")
            except psycopg.Error:
                pass
        reason = (
            getattr(getattr(exc, "diag", None), "message_primary", None)
            if isinstance(exc, psycopg.Error)
            else str(exc)
        )
        fail("Step 15 staging migration: " + str(reason or type(exc).__name__)[:220])
    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    main()
