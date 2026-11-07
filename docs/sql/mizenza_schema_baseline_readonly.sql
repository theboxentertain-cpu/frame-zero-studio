-- MIZENZA, 7 Nov 2026: READ ONLY SCHEMA/GRANT INVENTORY.
-- Contains SELECT statements only. Never embeds connection strings or user records.
-- Execute in the explicitly identified target database using a read-only role.
-- Do NOT run any of the numbered migrations as part of this inventory.

-- 1. Expected relations and RLS. A missing relation is shown with exists=false.
WITH expected(name) AS (
  VALUES ('projects'),('briefs'),('brief_revisions'),('scenes'),('shots'),
         ('approvals'),('storyboard_frames')
)
SELECT expected.name,
       c.oid IS NOT NULL AS exists,
       COALESCE(c.relrowsecurity,false) AS rls_enabled,
       c.relkind
FROM expected
LEFT JOIN pg_class c ON c.oid=to_regclass('public.'||expected.name)
ORDER BY expected.name;

-- 2. Required function identities, actual definer/invoker status.
WITH expected(name,signature) AS (
  VALUES
  ('revision_snapshot','public.fz_save_brief_revision(uuid,text)'),
  ('gate_status','public.fz_gate_status(uuid)'),
  ('prepare_storyboard','public.fz_prepare_storyboard(uuid)'),
  ('save_storyboard','public.fz_save_storyboard(uuid,integer,jsonb)'),
  ('attach_storyboard','public.fz_attach_storyboard(uuid,integer,text,text,text)'),
  ('review_storyboard','public.fz_review_storyboard(uuid,integer)')
)
SELECT expected.name, p.oid IS NOT NULL AS exists,
       COALESCE(p.prosecdef,false) AS security_definer,
       CASE WHEN p.oid IS NOT NULL THEN pg_get_function_identity_arguments(p.oid)
            ELSE NULL END AS arguments
FROM expected LEFT JOIN pg_proc p ON p.oid=to_regprocedure(expected.signature)
ORDER BY expected.name;

-- 3. Actual table ACLs and unprivileged role checks (no user secrets).
SELECT relname, relacl::text AS acl,
       has_table_privilege('authenticated',oid,'INSERT') AS authenticated_insert,
       has_table_privilege('authenticated',oid,'UPDATE') AS authenticated_update,
       has_table_privilege('authenticated',oid,'DELETE') AS authenticated_delete,
       has_table_privilege('authenticated',oid,'TRUNCATE') AS authenticated_truncate
FROM pg_class
WHERE oid IN (to_regclass('public.briefs'),to_regclass('public.brief_revisions'))
ORDER BY relname;

-- 4. Are the client-editable columns writable and snapshot metadata protected?
SELECT
  has_column_privilege('authenticated','public.briefs','notes','UPDATE')
    AS notes_update_permitted,
  has_column_privilege('authenticated','public.briefs','source_facts','UPDATE')
    AS source_facts_update_permitted,
  has_column_privilege('authenticated','public.briefs','current_revision','UPDATE')
    AS revision_counter_update_permitted;

-- 5. Owner RLS policies and functions exist (names and expressions only).
SELECT schemaname,tablename,policyname,cmd,roles::text,qual,with_check
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('projects','briefs','brief_revisions','storyboard_frames')
ORDER BY tablename,policyname;

-- 6. Private Storage bucket status only; never list actual user objects.
SELECT id,name,public FROM storage.buckets WHERE id='project-files';

-- 7. Trigger inventory, excluding internal referential-integrity triggers.
SELECT c.relname AS relation,t.tgname,pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid=c.oid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('projects','briefs','brief_revisions','storyboard_frames')
  AND NOT t.tgisinternal ORDER BY relation,t.tgname;
