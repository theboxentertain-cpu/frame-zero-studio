"""FRAME ZERO staging-only, explicit preview/apply of pinned SQL migrations."""
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit, unquote
import psycopg

REF = "crvgvcokzryoxyvjkhxn"
MIGRATIONS = [
    Path("drizzle/migrations/0000_frame_zero_foundation.sql"),
    Path("drizzle/migrations/0001_fix_gate_status_arrays.sql"),
    Path("drizzle/migrations/0002_recovery_security.sql"),
    Path("step15-source/drizzle/migrations/0003_step15_storyboard.sql"),
    Path("step15-source/drizzle/migrations/0004_step15_review.sql"),
    Path("step15-source/drizzle/migrations/0005_step15_versioned_writes.sql"),
]

def stop(reason):
    raise ValueError(reason)

def main():
    mode = os.environ.get("FZ_SCHEMA_MODE", "")
    confirmation = os.environ.get("FZ_SCHEMA_CONFIRMATION", "")
    dsn = os.environ.get("STAGING_DATABASE_URL", "")
    if mode not in ("preview", "apply"):
        stop("Unknown action; choose preview or apply.")
    if mode == "apply" and confirmation != "APPLY FRAME ZERO STAGING":
        stop("Apply requires exact confirmation: APPLY FRAME ZERO STAGING")
    if not dsn:
        stop("STAGING_DATABASE_URL GitHub secret is missing.")
    try:
        url = urlsplit(dsn)
        host = (url.hostname or "").lower()
        username = unquote(url.username or "")
        password = unquote(url.password or "")
        port = url.port
    except ValueError:
        stop("Invalid database URL format.")
    if url.scheme not in ("postgresql", "postgres"):
        stop("Database URL must use PostgreSQL.")
    if not host.endswith(".pooler.supabase.com") or port != 5432:
        stop("Only a Supabase Session Pooler URL (port 5432) is accepted.")
    if url.path != "/postgres" or username != "postgres." + REF:
        stop("Database target is not the locked FRAME ZERO staging project.")
    if not password or password.startswith("[") or password.endswith("]"):
        stop("Database password is blank or is a placeholder.")
    if not all(path.is_file() for path in MIGRATIONS):
        stop("Pinned migration source files are missing.")

    stage = "connection and preflight"
    conn = None
    opened = False
    try:
        conn = psycopg.connect(dsn, connect_timeout=15, sslmode="require", autocommit=True)
        with conn.cursor() as cur:
            cur.execute("BEGIN")
            opened = True
            cur.execute("SET LOCAL statement_timeout = '90s'")
            cur.execute("SET LOCAL lock_timeout = '10s'")
            cur.execute("SELECT current_database()")
            if cur.fetchone()[0] != "postgres":
                stop("Unexpected database name.")
            cur.execute("SELECT to_regclass('public.projects'),to_regclass('public.storyboard_frames'),to_regtype('public.fz_gate')")
            if any(item is not None for item in cur.fetchone()):
                stop("FRAME ZERO schema already exists; installer only supports fresh staging.")
            cur.execute("SELECT to_regclass('auth.users'),to_regclass('storage.objects'),to_regclass('storage.buckets')")
            if any(item is None for item in cur.fetchone()):
                stop("Supabase Auth or Storage system tables are missing.")
            print("Verified staging project identity and fresh application schema.")

            for file in MIGRATIONS:
                stage = file.name
                cur.execute(file.read_text(encoding="utf-8"))
                print("Validated migration " + file.name)

            stage = "private storage bucket"
            cur.execute("INSERT INTO storage.buckets (id,name,public) VALUES ('project-files','project-files',false) ON CONFLICT (id) DO NOTHING")
            cur.execute("SELECT public FROM storage.buckets WHERE id='project-files'")
            result = cur.fetchone()
            if result is None or result[0] is not False:
                stop("project-files storage bucket is not private.")

            stage = "post-migration RLS validation"
            cur.execute("""SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public'
                AND tablename IN ('projects','scenes','shots','approvals','storyboard_frames')""")
            private_tables = dict(cur.fetchall())
            if len(private_tables) != 5 or not all(private_tables.values()):
                stop("Expected owner-only tables with RLS were not installed.")
            cur.execute("SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='storyboard_frames'")
            if cur.fetchone()[0] < 3:
                stop("Storyboard owner policies are missing.")

            if mode == "preview":
                cur.execute("ROLLBACK")
                opened = False
                print("SUCCESS: All six migrations compiled and validated.")
                print("PREVIEW MODE: All changes rolled back. Nothing installed.")
            else:
                cur.execute("COMMIT")
                opened = False
                print("SUCCESS: All six migrations committed to staging only.")
                print("Private project-files storage bucket is installed. Production untouched.")
    except (psycopg.Error, ValueError, OSError) as exc:
        if conn is not None and opened:
            try:
                conn.execute("ROLLBACK")
            except psycopg.Error:
                pass
        reason = getattr(getattr(exc, "diag", None), "message_primary", None)
        reason = reason or (str(exc) if isinstance(exc, ValueError) else type(exc).__name__)
        print("FAILED at " + stage + ": " + reason[:220], file=sys.stderr)
        sys.exit(1)
    finally:
        if conn is not None:
            conn.close()

if __name__ == "__main__":
    main()
