-- Step 15 follow-up. The original 0003–0005 files have already run in the
-- dedicated staging project; never rewrite them in place.
-- Require all record creation through fz_prepare_storyboard. The older 0003
-- migration granted direct INSERT/DELETE, which bypassed the approval RPC.
REVOKE INSERT, DELETE ON public.storyboard_frames FROM authenticated;

-- Harden attach and director review against withdrawn/stale shot-list approval.
-- A manual reference NEVER advances the 'film_stills' generation gate.

CREATE OR REPLACE FUNCTION public.fz_attach_storyboard(
  _frame_id uuid, _version integer, _path text, _hash text, _rights_note text
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  f public.storyboard_frames;
  sh public.shots;
  sc public.scenes;
  gate_state record;
  new_version integer;
BEGIN
  SELECT * INTO f FROM public.storyboard_frames WHERE id=_frame_id FOR UPDATE;
  IF NOT FOUND OR NOT public.fz_owns_project(f.project_id) THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF f.version<>_version THEN RAISE EXCEPTION 'version_conflict'; END IF;
  IF f.archived_at IS NOT NULL THEN RAISE EXCEPTION 'frame_archived'; END IF;

  SELECT * INTO sh FROM public.shots
    WHERE id=f.shot_id AND project_id=f.project_id AND archived_at IS NULL;
  SELECT * INTO sc FROM public.scenes
    WHERE id=f.scene_id AND project_id=f.project_id AND archived_at IS NULL;
  IF sh.id IS NULL OR sc.id IS NULL OR sh.scene_id<>sc.id
     OR sh.version<>f.source_shot_version
     OR sc.version<>f.source_scene_version THEN
    RAISE EXCEPTION 'shot_source_changed';
  END IF;

  SELECT * INTO gate_state
  FROM public.fz_gate_status(f.project_id) WHERE gate='shot_list';
  IF NOT COALESCE(gate_state.ready,false)
     OR NOT COALESCE(gate_state.approved,false)
     OR COALESCE(gate_state.stale,true) THEN
    RAISE EXCEPTION 'shot_list_not_approved';
  END IF;

  IF _path NOT LIKE (
      auth.uid()::text||'/'||f.project_id::text||'/stills/'||f.shot_id::text||'/%'
    ) OR _hash !~ '^[0-9a-f]{64}$'
      OR length(btrim(coalesce(_rights_note,'')))<8 THEN
    RAISE EXCEPTION 'invalid_image_reference';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id='project-files' AND name=_path
  ) THEN RAISE EXCEPTION 'private_object_missing'; END IF;

  UPDATE public.storyboard_frames
  SET image_path=_path, image_hash=_hash, rights_note=left(_rights_note,4000),
      reviewed_at=NULL
  WHERE id=f.id RETURNING version INTO new_version;
  RETURN new_version;
END $$;
REVOKE ALL ON FUNCTION public.fz_attach_storyboard(uuid,integer,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fz_attach_storyboard(uuid,integer,text,text,text) TO authenticated;


CREATE OR REPLACE FUNCTION public.fz_review_storyboard(_frame_id uuid,_version integer)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  f public.storyboard_frames;
  sh public.shots;
  sc public.scenes;
  gate_state record;
  review_time timestamptz;
BEGIN
  SELECT * INTO f FROM public.storyboard_frames WHERE id=_frame_id FOR UPDATE;
  IF NOT FOUND OR NOT public.fz_owns_project(f.project_id) THEN
    RAISE EXCEPTION 'not_found';
  END IF;
  IF f.version<>_version THEN RAISE EXCEPTION 'version_conflict'; END IF;
  IF f.archived_at IS NOT NULL THEN RAISE EXCEPTION 'frame_archived'; END IF;

  SELECT * INTO sh FROM public.shots
    WHERE id=f.shot_id AND project_id=f.project_id AND archived_at IS NULL;
  SELECT * INTO sc FROM public.scenes
    WHERE id=f.scene_id AND project_id=f.project_id AND archived_at IS NULL;
  IF sh.id IS NULL OR sc.id IS NULL OR sh.scene_id<>sc.id
     OR sh.version<>f.source_shot_version
     OR sc.version<>f.source_scene_version THEN
    RAISE EXCEPTION 'shot_source_changed';
  END IF;

  SELECT * INTO gate_state
  FROM public.fz_gate_status(f.project_id) WHERE gate='shot_list';
  IF NOT COALESCE(gate_state.ready,false)
     OR NOT COALESCE(gate_state.approved,false)
     OR COALESCE(gate_state.stale,true) THEN
    RAISE EXCEPTION 'shot_list_not_approved';
  END IF;

  IF btrim(f.dramatic_intent)='' OR btrim(f.composition)=''
     OR btrim(f.performance_anchor)='' OR btrim(f.lighting)=''
     OR btrim(f.palette)='' OR btrim(f.continuity_locks)=''
     OR length(btrim(f.rights_note))<8 OR f.image_path IS NULL THEN
    RAISE EXCEPTION 'frame_incomplete';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id='project-files' AND name=f.image_path
  ) THEN RAISE EXCEPTION 'private_object_missing'; END IF;

  UPDATE public.storyboard_frames SET reviewed_at=now()
  WHERE id=f.id RETURNING reviewed_at INTO review_time;
  RETURN review_time;
END $$;
REVOKE ALL ON FUNCTION public.fz_review_storyboard(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fz_review_storyboard(uuid,integer) TO authenticated;
