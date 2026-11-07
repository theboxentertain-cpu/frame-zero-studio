-- MIZENZA Step 15 staging ACL follow-up. DO NOT APPLY TO PRODUCTION AUTOMATICALLY.
-- The live staging audit found authenticated TRUNCATE grants on all 20 app
-- tables, plus broad anon privileges on public.storyboard_frames.
-- TRUNCATE bypasses RLS. This migration is a forward-only candidate for
-- testing in PGlite and on an explicitly approved staging clone.
-- Assumes 0000–0007, does not modify application records.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'approvals','attachments','brief_revisions','briefs','budget_lines',
    'characters','continuity_notes','creative_references','dialogue_lines',
    'history','interpretations','locations','performance_plans','profiles',
    'projects','scenes','shots','storyboard_frames','treatments','voice_profiles'
  ] LOOP
    IF to_regclass(format('public.%I',t)) IS NULL THEN
      RAISE EXCEPTION 'acl_required_table_missing: %',t;
    END IF;
    -- Preserve permitted SELECT/INSERT/UPDATE/DELETE and row policies for
    -- genuine client editors. Prevent RLS-bypassing bulk modification,
    -- unauthorized schema object permissions and table maintenance.
    EXECUTE format(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE public.%I
       FROM PUBLIC, anon, authenticated',t
    );
  END LOOP;
END $$;

-- Storyboards are mediated exclusively by owner-checking, versioned
-- SECURITY DEFINER RPCs. The browser needs SELECT to display the owner's
-- rows. Do not leave broad table-level or column-level write grants.
REVOKE ALL PRIVILEGES ON TABLE public.storyboard_frames
  FROM PUBLIC, anon, authenticated;

DO $$
DECLARE column_names text;
BEGIN
  SELECT string_agg(format('%I', a.attname), ', ' ORDER BY a.attnum)
  INTO column_names
  FROM pg_attribute a
  WHERE a.attrelid='public.storyboard_frames'::regclass
    AND a.attnum>0 AND NOT a.attisdropped;
  IF column_names IS NULL THEN RAISE EXCEPTION 'storyboard_columns_missing'; END IF;
  EXECUTE format(
    'REVOKE INSERT (%s), UPDATE (%s) ON TABLE public.storyboard_frames
     FROM PUBLIC, anon, authenticated',column_names,column_names
  );
END $$;

GRANT SELECT ON TABLE public.storyboard_frames TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
  LOOP
    -- Check all current public tables, not merely the expected whitelist.
    IF has_table_privilege('authenticated',format('public.%I',t),'TRUNCATE')
       OR has_table_privilege('anon',format('public.%I',t),'TRUNCATE') THEN
      RAISE EXCEPTION 'unprivileged_truncate_still_allowed: %',t;
    END IF;
  END LOOP;

  IF has_table_privilege('anon','public.storyboard_frames','SELECT')
     OR has_table_privilege('anon','public.storyboard_frames','INSERT')
     OR has_table_privilege('anon','public.storyboard_frames','DELETE')
     OR has_table_privilege('anon','public.storyboard_frames','UPDATE')
     OR has_table_privilege('authenticated','public.storyboard_frames','INSERT')
     OR has_table_privilege('authenticated','public.storyboard_frames','DELETE')
     OR has_table_privilege('authenticated','public.storyboard_frames','UPDATE')
     OR has_column_privilege('authenticated','public.storyboard_frames','composition','UPDATE')
     OR NOT has_table_privilege('authenticated','public.storyboard_frames','SELECT')
     OR NOT (SELECT c.relrowsecurity FROM pg_class c
             WHERE c.oid='public.storyboard_frames'::regclass) THEN
    RAISE EXCEPTION 'storyboard_role_boundary_invalid';
  END IF;
END $$;
