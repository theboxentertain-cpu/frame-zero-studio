-- FRAME ZERO foundation schema: owner-only private film projects

CREATE TYPE public.fz_mode AS ENUM ('storyteller','filmmaker','director');
CREATE TYPE public.fz_duration AS ENUM ('30s','3min','15min','60min');
CREATE TYPE public.fz_gate AS ENUM ('treatment','world','shot_list','film_stills','motion','final_cut');

-- ---------- profiles ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  mode public.fz_mode NOT NULL DEFAULT 'filmmaker',
  locale text NOT NULL DEFAULT 'ar' CHECK (locale IN ('ar','en')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.fz_handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.fz_handle_new_user();

-- ---------- shared trigger functions ----------
-- Optimistic lock support: every update bumps version; owner and project are immutable.
CREATE OR REPLACE FUNCTION public.fz_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'owner_id is immutable';
  END IF;
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.fz_lock_project_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    RAISE EXCEPTION 'project_id is immutable';
  END IF;
  RETURN NEW;
END $$;

-- ---------- projects ----------
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  logline_ar text,
  logline_en text,
  region text,
  duration_target public.fz_duration NOT NULL DEFAULT '3min',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_owner_idx ON public.projects(owner_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects select" ON public.projects FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "own projects insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "own projects update" ON public.projects FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "own projects delete" ON public.projects FOR DELETE TO authenticated USING (owner_id = auth.uid() AND status = 'archived');
CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.fz_touch();

CREATE OR REPLACE FUNCTION public.fz_owns_project(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND owner_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.fz_owns_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fz_owns_project(uuid) TO authenticated;

-- ---------- child tables ----------
CREATE TABLE public.briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  source_facts text NOT NULL DEFAULT '',
  proposed_interpretation text NOT NULL DEFAULT '',
  approved_decisions text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  current_revision integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.brief_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  revision_no integer NOT NULL,
  source_facts text NOT NULL,
  proposed_interpretation text NOT NULL,
  approved_decisions text NOT NULL,
  notes text NOT NULL,
  change_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, revision_no)
);

CREATE TABLE public.interpretations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  direction text NOT NULL CHECK (direction IN ('observational','spatial_pressure','selective_perspective')),
  selected boolean NOT NULL DEFAULT false,
  objective text NOT NULL DEFAULT '',
  obstacle text NOT NULL DEFAULT '',
  stakes text NOT NULL DEFAULT '',
  camera_logic text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review')),
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, direction)
);

CREATE TABLE public.creative_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'film' CHECK (kind IN ('director','film','acting','color','music','other')),
  source_title text NOT NULL DEFAULT '',
  admired_attributes text NOT NULL DEFAULT '',
  original_constraint text NOT NULL DEFAULT '',
  converted boolean NOT NULL DEFAULT false,
  notes text NOT NULL DEFAULT '',
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT '',
  governorate text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  place text NOT NULL DEFAULT '',
  period_year text NOT NULL DEFAULT '',
  architecture text NOT NULL DEFAULT '',
  interiors text NOT NULL DEFAULT '',
  props text NOT NULL DEFAULT '',
  sound_profile text NOT NULL DEFAULT '',
  evidence_notes text NOT NULL DEFAULT '',
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id)
);

CREATE TABLE public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT '',
  story_role text NOT NULL DEFAULT '',
  identity text NOT NULL DEFAULT '',
  age_range text NOT NULL DEFAULT '',
  appearance text NOT NULL DEFAULT '',
  regional_background text NOT NULL DEFAULT '',
  likeness_permission text NOT NULL DEFAULT 'fictional_original' CHECK (likeness_permission IN ('fictional_original','consent_pending','written_consent','not_permitted')),
  rights_notes text NOT NULL DEFAULT '',
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id)
);

CREATE TABLE public.scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  scene_number integer NOT NULL DEFAULT 1,
  title text NOT NULL DEFAULT '',
  act text NOT NULL DEFAULT '',
  synopsis text NOT NULL DEFAULT '',
  dramatic_purpose text NOT NULL DEFAULT '',
  turning_point text NOT NULL DEFAULT '',
  time_of_day text NOT NULL DEFAULT '',
  location_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review')),
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id),
  FOREIGN KEY (location_id, project_id) REFERENCES public.locations(id, project_id) ON DELETE SET NULL (location_id)
);

CREATE TABLE public.treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  level text NOT NULL DEFAULT 'film' CHECK (level IN ('film','sequence','scene')),
  parent_id uuid,
  scene_id uuid,
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  acting_intention text NOT NULL DEFAULT '',
  camera_intention text NOT NULL DEFAULT '',
  sound_intention text NOT NULL DEFAULT '',
  location_intention text NOT NULL DEFAULT '',
  continuity_intention text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review')),
  source_brief_revision integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id),
  FOREIGN KEY (parent_id, project_id) REFERENCES public.treatments(id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (scene_id, project_id) REFERENCES public.scenes(id, project_id) ON DELETE SET NULL (scene_id)
);

CREATE TABLE public.voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  character_id uuid NOT NULL,
  dialect text NOT NULL DEFAULT '',
  pronunciation_notes text NOT NULL DEFAULT '',
  speech_register text NOT NULL DEFAULT '',
  code_switching text NOT NULL DEFAULT '',
  voice_permission text NOT NULL DEFAULT 'none' CHECK (voice_permission IN ('none','pending','written_consent')),
  source_notes text NOT NULL DEFAULT '',
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_id),
  FOREIGN KEY (character_id, project_id) REFERENCES public.characters(id, project_id) ON DELETE CASCADE
);

CREATE TABLE public.dialogue_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  scene_id uuid NOT NULL,
  character_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  line_text text NOT NULL DEFAULT '',
  tactic text NOT NULL DEFAULT '',
  pause_notes text NOT NULL DEFAULT '',
  overlap_notes text NOT NULL DEFAULT '',
  code_switching text NOT NULL DEFAULT '',
  source_notes text NOT NULL DEFAULT '',
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (scene_id, project_id) REFERENCES public.scenes(id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (character_id, project_id) REFERENCES public.characters(id, project_id) ON DELETE SET NULL (character_id)
);

CREATE TABLE public.performance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  scene_id uuid NOT NULL,
  character_id uuid NOT NULL,
  objective text NOT NULL DEFAULT '',
  obstacle text NOT NULL DEFAULT '',
  playable_tactic text NOT NULL DEFAULT '',
  partner_cue text NOT NULL DEFAULT '',
  listening_reaction text NOT NULL DEFAULT '',
  physical_action text NOT NULL DEFAULT '',
  beats text NOT NULL DEFAULT '',
  source_scene_version integer NOT NULL DEFAULT 0,
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scene_id, character_id),
  FOREIGN KEY (scene_id, project_id) REFERENCES public.scenes(id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (character_id, project_id) REFERENCES public.characters(id, project_id) ON DELETE CASCADE
);

CREATE TABLE public.shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  scene_id uuid NOT NULL,
  shot_number text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  drama_function text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  framing text NOT NULL DEFAULT '',
  lens_rationale text NOT NULL DEFAULT '',
  movement_trigger text NOT NULL DEFAULT '',
  movement_end text NOT NULL DEFAULT '',
  blocking text NOT NULL DEFAULT '',
  duration_sec numeric(7,2),
  editing_reason text NOT NULL DEFAULT '',
  continuity_constraints text NOT NULL DEFAULT '',
  retake_notes text NOT NULL DEFAULT '',
  source_scene_version integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, project_id),
  FOREIGN KEY (scene_id, project_id) REFERENCES public.scenes(id, project_id) ON DELETE CASCADE
);

CREATE TABLE public.continuity_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  scene_id uuid,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('wardrobe','props','hair_makeup','eyeline','time','weather','sound','other')),
  note text NOT NULL DEFAULT '',
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (scene_id, project_id) REFERENCES public.scenes(id, project_id) ON DELETE SET NULL (scene_id)
);

CREATE TABLE public.budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('cast','crew','location','equipment','post','music','rights','other')),
  description text NOT NULL DEFAULT '',
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  notes text NOT NULL DEFAULT '',
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  purpose text NOT NULL DEFAULT 'reference',
  rights_note text NOT NULL DEFAULT '',
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grants, RLS, owner-only policies with nested project ownership, triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['briefs','interpretations','creative_references','locations','characters','scenes','treatments','voice_profiles','dialogue_lines','performance_plans','shots','continuity_notes','budget_lines','attachments']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "owner select" ON public.%I FOR SELECT TO authenticated USING (owner_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "owner insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.fz_owns_project(project_id))', t);
    EXECUTE format('CREATE POLICY "owner update" ON public.%I FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid() AND public.fz_owns_project(project_id))', t);
    EXECUTE format('CREATE POLICY "owner delete" ON public.%I FOR DELETE TO authenticated USING (owner_id = auth.uid())', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fz_touch()', t || '_touch', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fz_lock_project_id()', t || '_lock_project', t);
    EXECUTE format('CREATE INDEX %I ON public.%I (project_id)', t || '_project_idx', t);
  END LOOP;
END $$;

-- brief revisions are immutable snapshots
GRANT SELECT, INSERT ON public.brief_revisions TO authenticated;
GRANT ALL ON public.brief_revisions TO service_role;
ALTER TABLE public.brief_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner select" ON public.brief_revisions FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "owner insert" ON public.brief_revisions FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.fz_owns_project(project_id));

-- ---------- approvals (written only, server-enforced) ----------
CREATE TABLE public.approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  gate public.fz_gate NOT NULL,
  note text NOT NULL DEFAULT '',
  approved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, gate)
);
GRANT SELECT ON public.approvals TO authenticated;
GRANT ALL ON public.approvals TO service_role;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner select" ON public.approvals FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- ---------- history ----------
CREATE TABLE public.history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  record_version integer,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX history_project_idx ON public.history(project_id, created_at DESC);
GRANT SELECT ON public.history TO authenticated;
GRANT ALL ON public.history TO service_role;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner select" ON public.history FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.fz_log_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; pid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN r := to_jsonb(OLD); ELSE r := to_jsonb(NEW); END IF;
  IF TG_TABLE_NAME = 'projects' THEN pid := (r->>'id')::uuid; ELSE pid := (r->>'project_id')::uuid; END IF;
  IF TG_OP = 'DELETE' AND TG_TABLE_NAME <> 'projects' AND NOT EXISTS (SELECT 1 FROM public.projects WHERE id = pid) THEN
    RETURN OLD; -- cascade from project deletion
  END IF;
  INSERT INTO public.history(project_id, owner_id, table_name, record_id, action, record_version, snapshot)
  VALUES (pid, (r->>'owner_id')::uuid, TG_TABLE_NAME, (r->>'id')::uuid, lower(TG_OP), NULLIF(r->>'version','')::int, r);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fz_log_history() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projects','briefs','interpretations','creative_references','locations','characters','scenes','treatments','voice_profiles','dialogue_lines','performance_plans','shots','continuity_notes','budget_lines','approvals']
  LOOP
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fz_log_history()', t || '_history', t);
  END LOOP;
END $$;

-- ---------- seed brief + three directions on project creation ----------
CREATE OR REPLACE FUNCTION public.fz_project_seed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.briefs(project_id, owner_id) VALUES (NEW.id, NEW.owner_id);
  INSERT INTO public.interpretations(project_id, owner_id, direction)
  VALUES (NEW.id, NEW.owner_id, 'observational'), (NEW.id, NEW.owner_id, 'spatial_pressure'), (NEW.id, NEW.owner_id, 'selective_perspective');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fz_project_seed() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER projects_seed AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.fz_project_seed();

-- ---------- brief revision snapshot ----------
CREATE OR REPLACE FUNCTION public.fz_save_brief_revision(_project_id uuid, _change_note text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE b public.briefs; n integer;
BEGIN
  SELECT * INTO b FROM public.briefs WHERE project_id = _project_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'brief_not_found'; END IF;
  n := b.current_revision + 1;
  INSERT INTO public.brief_revisions(project_id, owner_id, revision_no, source_facts, proposed_interpretation, approved_decisions, notes, change_note)
  VALUES (_project_id, b.owner_id, n, b.source_facts, b.proposed_interpretation, b.approved_decisions, b.notes, _change_note);
  UPDATE public.briefs SET current_revision = n WHERE id = b.id;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.fz_save_brief_revision(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fz_save_brief_revision(uuid, text) TO authenticated;

-- ---------- gate readiness ----------
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
  IF NOT EXISTS (SELECT 1 FROM public.briefs WHERE project_id = _project_id AND btrim(approved_decisions) <> '') THEN m := m || 'brief_approved_decisions'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.briefs WHERE project_id = _project_id AND current_revision > 0) THEN m := m || 'brief_revision_saved'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.treatments WHERE project_id = _project_id AND archived_at IS NULL AND level = 'film' AND status = 'review' AND btrim(summary) <> '') THEN m := m || 'film_treatment_in_review'; END IF;
  SELECT * INTO a FROM public.approvals ap WHERE ap.project_id = _project_id AND ap.gate = 'treatment';
  t_ok := a.id IS NOT NULL;
  gate := 'treatment'; ready := cardinality(m) = 0; approved := a.id IS NOT NULL; approved_at := a.approved_at;
  stale := a.id IS NOT NULL AND (EXISTS (SELECT 1 FROM public.treatments WHERE project_id = _project_id AND updated_at > a.approved_at) OR EXISTS (SELECT 1 FROM public.briefs WHERE project_id = _project_id AND updated_at > a.approved_at));
  missing := m; RETURN NEXT;

  m := ARRAY[]::text[];
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE project_id = _project_id AND archived_at IS NULL AND locked) THEN m := m || 'locked_location'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.characters WHERE project_id = _project_id AND archived_at IS NULL AND locked) THEN m := m || 'locked_character'; END IF;
  IF EXISTS (SELECT 1 FROM public.characters WHERE project_id = _project_id AND archived_at IS NULL AND locked AND likeness_permission IN ('consent_pending','not_permitted')) THEN m := m || 'character_rights_unresolved'; END IF;
  SELECT * INTO a FROM public.approvals ap WHERE ap.project_id = _project_id AND ap.gate = 'world';
  gate := 'world'; ready := cardinality(m) = 0; approved := a.id IS NOT NULL; approved_at := a.approved_at;
  stale := a.id IS NOT NULL AND (EXISTS (SELECT 1 FROM public.locations WHERE project_id = _project_id AND updated_at > a.approved_at) OR EXISTS (SELECT 1 FROM public.characters WHERE project_id = _project_id AND updated_at > a.approved_at));
  missing := m; RETURN NEXT;

  m := ARRAY[]::text[];
  IF NOT t_ok THEN m := m || 'treatment_approved'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shots WHERE project_id = _project_id AND archived_at IS NULL) THEN m := m || 'at_least_one_shot'; END IF;
  IF EXISTS (SELECT 1 FROM public.shots WHERE project_id = _project_id AND archived_at IS NULL AND (
      btrim(drama_function) = '' OR btrim(subject) = '' OR btrim(framing) = '' OR btrim(lens_rationale) = '' OR
      btrim(movement_trigger) = '' OR btrim(movement_end) = '' OR btrim(blocking) = '' OR duration_sec IS NULL OR duration_sec <= 0 OR
      btrim(editing_reason) = '' OR btrim(continuity_constraints) = '')) THEN m := m || 'all_shot_fields_complete'; END IF;
  SELECT * INTO a FROM public.approvals ap WHERE ap.project_id = _project_id AND ap.gate = 'shot_list';
  gate := 'shot_list'; ready := cardinality(m) = 0; approved := a.id IS NOT NULL; approved_at := a.approved_at;
  stale := a.id IS NOT NULL AND EXISTS (SELECT 1 FROM public.shots WHERE project_id = _project_id AND updated_at > a.approved_at);
  missing := m; RETURN NEXT;

  gate := 'film_stills'; ready := false; approved := false; approved_at := NULL; stale := false; missing := ARRAY['generation_not_connected']; RETURN NEXT;
  gate := 'motion'; ready := false; approved := false; approved_at := NULL; stale := false; missing := ARRAY['generation_not_connected']; RETURN NEXT;
  gate := 'final_cut'; ready := false; approved := false; approved_at := NULL; stale := false; missing := ARRAY['generation_not_connected']; RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.fz_gate_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fz_gate_status(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fz_approve_gate(_project_id uuid, _gate public.fz_gate, _note text DEFAULT '')
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; ts timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.fz_owns_project(_project_id) THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _gate IN ('film_stills','motion','final_cut') THEN RAISE EXCEPTION 'gate_not_operational'; END IF;
  SELECT * INTO s FROM public.fz_gate_status(_project_id) g WHERE g.gate = _gate;
  IF NOT s.ready THEN RAISE EXCEPTION 'gate_not_ready: %', array_to_string(s.missing, ','); END IF;
  INSERT INTO public.approvals(project_id, owner_id, gate, note, approved_at)
  VALUES (_project_id, auth.uid(), _gate, COALESCE(_note,''), now())
  ON CONFLICT (project_id, gate) DO UPDATE SET note = EXCLUDED.note, approved_at = now()
  RETURNING approved_at INTO ts;
  RETURN ts;
END $$;
REVOKE ALL ON FUNCTION public.fz_approve_gate(uuid, public.fz_gate, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fz_approve_gate(uuid, public.fz_gate, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fz_revoke_gate(_project_id uuid, _gate public.fz_gate)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.fz_owns_project(_project_id) THEN RAISE EXCEPTION 'not_found'; END IF;
  DELETE FROM public.approvals WHERE project_id = _project_id AND gate = _gate;
  IF _gate = 'treatment' THEN DELETE FROM public.approvals WHERE project_id = _project_id AND gate = 'shot_list'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.fz_revoke_gate(uuid, public.fz_gate) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fz_revoke_gate(uuid, public.fz_gate) TO authenticated;

-- ---------- duplicate project (written development material only) ----------
CREATE OR REPLACE FUNCTION public.fz_duplicate_project(_project_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE p public.projects; nid uuid;
BEGIN
  SELECT * INTO p FROM public.projects WHERE id = _project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  INSERT INTO public.projects(title, logline_ar, logline_en, region, duration_target)
  VALUES (left(p.title || ' — copy', 200), p.logline_ar, p.logline_en, p.region, p.duration_target)
  RETURNING id INTO nid;
  UPDATE public.briefs nb SET source_facts = ob.source_facts, proposed_interpretation = ob.proposed_interpretation,
    approved_decisions = ob.approved_decisions, notes = ob.notes
  FROM public.briefs ob WHERE ob.project_id = _project_id AND nb.project_id = nid;
  UPDATE public.interpretations ni SET selected = oi.selected, objective = oi.objective, obstacle = oi.obstacle, stakes = oi.stakes,
    camera_logic = oi.camera_logic, notes = oi.notes
  FROM public.interpretations oi WHERE oi.project_id = _project_id AND ni.project_id = nid AND ni.direction = oi.direction;
  INSERT INTO public.creative_references(project_id, kind, source_title, admired_attributes, original_constraint, converted, notes)
  SELECT nid, kind, source_title, admired_attributes, original_constraint, converted, notes FROM public.creative_references WHERE project_id = _project_id AND archived_at IS NULL;
  INSERT INTO public.characters(project_id, name, story_role, identity, age_range, appearance, regional_background, likeness_permission, rights_notes)
  SELECT nid, name, story_role, identity, age_range, appearance, regional_background, likeness_permission, rights_notes FROM public.characters WHERE project_id = _project_id AND archived_at IS NULL;
  INSERT INTO public.locations(project_id, name, governorate, district, place, period_year, architecture, interiors, props, sound_profile, evidence_notes)
  SELECT nid, name, governorate, district, place, period_year, architecture, interiors, props, sound_profile, evidence_notes FROM public.locations WHERE project_id = _project_id AND archived_at IS NULL;
  RETURN nid;
END $$;
REVOKE ALL ON FUNCTION public.fz_duplicate_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fz_duplicate_project(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.fz_handle_new_user() FROM PUBLIC, anon, authenticated;

-- ---------- private storage policies (bucket project-files created via storage tool) ----------
CREATE POLICY "fz owner read files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "fz owner upload files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text AND public.fz_owns_project(((storage.foldername(name))[2])::uuid));
CREATE POLICY "fz owner delete files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-files' AND (storage.foldername(name))[1] = auth.uid()::text);
