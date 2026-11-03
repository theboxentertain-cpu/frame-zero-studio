-- Additive recovery hardening. Apply only after staging verification and review.
-- Snapshot creation is the only authenticated path allowed to assign revisions.
REVOKE INSERT ON public.brief_revisions FROM authenticated;
REVOKE UPDATE ON public.briefs FROM authenticated;
GRANT UPDATE (source_facts, proposed_interpretation, approved_decisions, notes) ON public.briefs TO authenticated;
CREATE OR REPLACE FUNCTION public.fz_save_brief_revision(_project_id uuid, _change_note text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.briefs; n integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.fz_owns_project(_project_id) THEN RAISE EXCEPTION 'not_found'; END IF;
 SELECT * INTO b FROM public.briefs WHERE project_id = _project_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'brief_not_found'; END IF;
 n := b.current_revision + 1;
 INSERT INTO public.brief_revisions(project_id, owner_id, revision_no, source_facts, proposed_interpretation, approved_decisions, notes, change_note)
 VALUES (_project_id,b.owner_id,n,b.source_facts,b.proposed_interpretation,b.approved_decisions,b.notes,_change_note);
 UPDATE public.briefs SET current_revision = n WHERE id = b.id;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.fz_save_brief_revision(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fz_save_brief_revision(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fz_gate_status(_project_id uuid)
RETURNS TABLE(gate public.fz_gate, ready boolean, approved boolean, approved_at timestamptz, stale boolean, missing text[])
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
  m text[];
  a public.approvals;
  t_ok boolean;
BEGIN
  IF NOT public.fz_owns_project(_project_id) THEN RAISE EXCEPTION 'not_found'; END IF;

  m := ARRAY[]::text[];
  IF NOT EXISTS (SELECT 1 FROM public.briefs WHERE project_id = _project_id AND btrim(approved_decisions) <> '') THEN m := array_append(m, 'brief_approved_decisions'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.briefs WHERE project_id = _project_id AND current_revision > 0) THEN m := array_append(m, 'brief_revision_saved'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.treatments WHERE project_id = _project_id AND archived_at IS NULL AND level = 'film' AND status = 'review' AND btrim(summary) <> '') THEN m := array_append(m, 'film_treatment_in_review'); END IF;
  IF EXISTS (SELECT 1 FROM public.treatments t JOIN public.briefs b USING (project_id) WHERE t.project_id = _project_id AND t.archived_at IS NULL AND t.source_brief_revision <> b.current_revision) THEN m := array_append(m, 'treatment_source_changed'); END IF;
  SELECT * INTO a FROM public.approvals ap WHERE ap.project_id = _project_id AND ap.gate = 'treatment';

  gate := 'treatment'; ready := cardinality(m) = 0; approved := a.id IS NOT NULL; approved_at := a.approved_at;
  stale := a.id IS NOT NULL AND (EXISTS (SELECT 1 FROM public.treatments WHERE project_id = _project_id AND updated_at > a.approved_at) OR EXISTS (SELECT 1 FROM public.briefs WHERE project_id = _project_id AND updated_at > a.approved_at));
  t_ok := a.id IS NOT NULL AND NOT stale AND cardinality(m) = 0;
  stale := a.id IS NOT NULL AND (stale OR cardinality(m) > 0);
  missing := m; RETURN NEXT;

  m := ARRAY[]::text[];
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE project_id = _project_id AND archived_at IS NULL AND locked) THEN m := array_append(m, 'locked_location'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE project_id = _project_id AND archived_at IS NULL AND locked) THEN m := array_append(m, 'locked_character'); END IF;
  IF EXISTS (SELECT 1 FROM public.characters WHERE project_id = _project_id AND archived_at IS NULL AND locked AND likeness_permission IN ('consent_pending','not_permitted')) THEN m := array_append(m, 'character_rights_unresolved'); END IF;
  SELECT * INTO a FROM public.approvals ap WHERE ap.project_id = _project_id AND ap.gate = 'world';
  gate := 'world'; ready := cardinality(m) = 0; approved := a.id IS NOT NULL; approved_at := a.approved_at;
  stale := a.id IS NOT NULL AND (EXISTS (SELECT 1 FROM public.locations WHERE project_id = _project_id AND updated_at > a.approved_at) OR EXISTS (SELECT 1 FROM public.characters WHERE project_id = _project_id AND updated_at > a.approved_at));
  stale := a.id IS NOT NULL AND (stale OR cardinality(m) > 0);
  missing := m; RETURN NEXT;

  m := ARRAY[]::text[];
  IF NOT t_ok THEN m := array_append(m, 'treatment_approved'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shots WHERE project_id = _project_id AND archived_at IS NULL) THEN m := array_append(m, 'at_least_one_shot'); END IF;
  IF EXISTS (SELECT 1 FROM public.shots WHERE project_id = _project_id AND archived_at IS NULL AND (
      btrim(drama_function) = '' OR btrim(subject) = '' OR btrim(framing) = '' OR btrim(lens_rationale) = '' OR
      btrim(movement_trigger) = '' OR btrim(movement_end) = '' OR btrim(blocking) = '' OR duration_sec IS NULL OR duration_sec <= 0 OR
      btrim(editing_reason) = '' OR btrim(continuity_constraints) = '')) THEN m := array_append(m, 'all_shot_fields_complete'); END IF;
  IF EXISTS (SELECT 1 FROM public.shots sh JOIN public.scenes sc ON sc.id = sh.scene_id AND sc.project_id = sh.project_id WHERE sh.project_id = _project_id AND sh.archived_at IS NULL AND (sc.archived_at IS NOT NULL OR sh.source_scene_version <> sc.version)) THEN m := array_append(m, 'shot_source_changed'); END IF;
  SELECT * INTO a FROM public.approvals ap WHERE ap.project_id = _project_id AND ap.gate = 'shot_list';
  gate := 'shot_list'; ready := cardinality(m) = 0; approved := a.id IS NOT NULL; approved_at := a.approved_at;
  stale := a.id IS NOT NULL AND EXISTS (SELECT 1 FROM public.shots WHERE project_id = _project_id AND updated_at > a.approved_at);
  stale := a.id IS NOT NULL AND (stale OR cardinality(m) > 0);
  missing := m; RETURN NEXT;

  gate := 'film_stills'; ready := false; approved := false; approved_at := NULL; stale := false; missing := ARRAY['generation_not_connected']::text[]; RETURN NEXT;
  gate := 'motion'; ready := false; approved := false; approved_at := NULL; stale := false; missing := ARRAY['generation_not_connected']::text[]; RETURN NEXT;
  gate := 'final_cut'; ready := false; approved := false; approved_at := NULL; stale := false; missing := ARRAY['generation_not_connected']::text[]; RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.fz_gate_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fz_gate_status(uuid) TO authenticated;
