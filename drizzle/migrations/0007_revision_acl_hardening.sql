-- MIZENZA security correction candidate. ISOLATED/STAGING VALIDATION ONLY.
-- This migration is NOT applied to the Lovable cloud database by a GitHub merge.
-- Requires reviewed migration 0002: the revision-snapshot RPC must be SECURITY DEFINER.
-- Existing revisions and briefs are preserved. No data writes, rebuilds or user deletion.
-- Historic 0000-0006 migration files must NEVER be rewritten in place.

DO $$
BEGIN
  IF to_regclass('public.briefs') IS NULL OR
     to_regclass('public.brief_revisions') IS NULL THEN
    RAISE EXCEPTION 'missing_revision_tables';
  END IF;
  IF NOT COALESCE((
    SELECT p.prosecdef FROM pg_proc p
    WHERE p.oid = to_regprocedure('public.fz_save_brief_revision(uuid,text)')
  ), false) THEN
    RAISE EXCEPTION 'revision_rpc_not_security_definer_apply_0002_first';
  END IF;
END $$;

-- The original production grants were far broader than the planned 0002 state.
-- Revision rows are immutable for authenticated clients; only an ownership-
-- checked SECURITY DEFINER RPC may create them.
REVOKE ALL PRIVILEGES ON TABLE public.brief_revisions
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.brief_revisions TO authenticated;

-- A project seed trigger and the revision RPC run with elevated function-owner
-- privileges. Authenticated clients can only edit the four human-authorable
-- brief fields, not insert/delete a brief, update revision counters or truncate it.
REVOKE ALL PRIVILEGES ON TABLE public.briefs
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.briefs TO authenticated;
GRANT UPDATE (source_facts, proposed_interpretation, approved_decisions, notes)
  ON TABLE public.briefs TO authenticated;

-- Fail the transaction if role privileges still permit snapshot/counter forgery.
DO $$
BEGIN
  IF has_table_privilege('authenticated','public.brief_revisions','INSERT')
     OR has_table_privilege('authenticated','public.brief_revisions','UPDATE')
     OR has_table_privilege('authenticated','public.brief_revisions','DELETE')
     OR has_table_privilege('authenticated','public.brief_revisions','TRUNCATE')
     OR has_column_privilege('authenticated','public.briefs','current_revision','UPDATE')
     OR has_table_privilege('authenticated','public.briefs','INSERT')
     OR has_table_privilege('authenticated','public.briefs','DELETE')
     OR has_table_privilege('authenticated','public.briefs','TRUNCATE') THEN
    RAISE EXCEPTION 'revision_grant_hardening_failed';
  END IF;
  IF NOT has_table_privilege('authenticated','public.brief_revisions','SELECT')
     OR NOT has_column_privilege('authenticated','public.briefs','notes','UPDATE') THEN
    RAISE EXCEPTION 'expected_editor_privilege_missing';
  END IF;
END $$;
