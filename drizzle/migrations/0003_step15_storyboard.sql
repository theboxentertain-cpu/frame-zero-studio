-- STEP 15: private shot-linked manual storyboard references.
-- Staging migration only: do not apply to Lovable production without a review.
CREATE TABLE public.storyboard_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  scene_id uuid NOT NULL,
  shot_id uuid NOT NULL UNIQUE,
  source_scene_version integer NOT NULL CHECK (source_scene_version > 0),
  source_shot_version integer NOT NULL CHECK (source_shot_version > 0),
  dramatic_intent text NOT NULL DEFAULT '',
  composition text NOT NULL DEFAULT '',
  performance_anchor text NOT NULL DEFAULT '',
  lighting text NOT NULL DEFAULT '',
  palette text NOT NULL DEFAULT 'restrained',
  continuity_locks text NOT NULL DEFAULT '',
  director_notes text NOT NULL DEFAULT '',
  image_path text UNIQUE,
  image_hash text,
  rights_note text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(scene_id,project_id) REFERENCES public.scenes(id,project_id) ON DELETE CASCADE,
  FOREIGN KEY(shot_id,project_id) REFERENCES public.shots(id,project_id) ON DELETE CASCADE,
  CONSTRAINT fz_still_path CHECK (
    image_path IS NULL OR image_path LIKE
    (owner_id::text||'/'||project_id::text||'/stills/'||shot_id::text||'/%')
  )
);
ALTER TABLE public.storyboard_frames ENABLE ROW LEVEL SECURITY;
GRANT SELECT,DELETE ON public.storyboard_frames TO authenticated;
GRANT INSERT (project_id,scene_id,shot_id,source_scene_version,source_shot_version)
 ON public.storyboard_frames TO authenticated;
GRANT UPDATE (dramatic_intent,composition,performance_anchor,lighting,palette,
  continuity_locks,director_notes,image_path,image_hash,rights_note,archived_at)
 ON public.storyboard_frames TO authenticated;
GRANT ALL ON public.storyboard_frames TO service_role;
CREATE POLICY "storyboard read owner" ON public.storyboard_frames
 FOR SELECT TO authenticated USING(owner_id=auth.uid() AND public.fz_owns_project(project_id));
CREATE POLICY "storyboard create owner" ON public.storyboard_frames
 FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid() AND public.fz_owns_project(project_id));
CREATE POLICY "storyboard update owner" ON public.storyboard_frames
 FOR UPDATE TO authenticated USING(owner_id=auth.uid() AND public.fz_owns_project(project_id))
 WITH CHECK(owner_id=auth.uid() AND public.fz_owns_project(project_id));
CREATE POLICY "storyboard delete owner" ON public.storyboard_frames
 FOR DELETE TO authenticated USING(owner_id=auth.uid() AND public.fz_owns_project(project_id));
CREATE TRIGGER storyboard_touch BEFORE UPDATE ON public.storyboard_frames
 FOR EACH ROW EXECUTE FUNCTION public.fz_touch();
CREATE TRIGGER storyboard_lock BEFORE UPDATE ON public.storyboard_frames
 FOR EACH ROW EXECUTE FUNCTION public.fz_lock_project_id();
CREATE TRIGGER storyboard_history AFTER INSERT OR UPDATE OR DELETE ON public.storyboard_frames
 FOR EACH ROW EXECUTE FUNCTION public.fz_log_history();
