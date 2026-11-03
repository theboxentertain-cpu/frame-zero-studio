-- Step 15 review RPCs. Apply only after 0003, on an approved staging copy.
-- A source change or note edit revokes director review while retaining the notes.
CREATE OR REPLACE FUNCTION public.fz_storyboard_review_reset()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF ROW(NEW.dramatic_intent,NEW.composition,NEW.performance_anchor,NEW.lighting,
        NEW.palette,NEW.continuity_locks,NEW.director_notes,NEW.image_path,
        NEW.image_hash,NEW.rights_note,NEW.archived_at)
    IS DISTINCT FROM
    ROW(OLD.dramatic_intent,OLD.composition,OLD.performance_anchor,OLD.lighting,
        OLD.palette,OLD.continuity_locks,OLD.director_notes,OLD.image_path,
        OLD.image_hash,OLD.rights_note,OLD.archived_at)
 THEN NEW.reviewed_at := NULL; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fz_storyboard_review_reset() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER storyboard_review_reset BEFORE UPDATE ON public.storyboard_frames
 FOR EACH ROW EXECUTE FUNCTION public.fz_storyboard_review_reset();

-- Users cannot directly substitute paths or provenance; only this verified RPC.
REVOKE UPDATE(image_path,image_hash,rights_note) ON public.storyboard_frames FROM authenticated;

CREATE OR REPLACE FUNCTION public.fz_prepare_storyboard(_shot_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sh public.shots; sc public.scenes; rec record; fid uuid;
BEGIN
 SELECT * INTO sh FROM public.shots WHERE id=_shot_id AND archived_at IS NULL;
 IF NOT FOUND OR NOT public.fz_owns_project(sh.project_id) THEN RAISE EXCEPTION 'not_found'; END IF;
 SELECT * INTO sc FROM public.scenes WHERE id=sh.scene_id AND archived_at IS NULL;
 IF NOT FOUND OR sc.version<>sh.source_scene_version THEN RAISE EXCEPTION 'shot_source_changed'; END IF;
 SELECT * INTO rec FROM public.fz_gate_status(sh.project_id)
 WHERE gate='shot_list';
 IF NOT rec.ready OR NOT rec.approved OR rec.stale THEN
   RAISE EXCEPTION 'shot_list_not_approved'; END IF;
 INSERT INTO public.storyboard_frames
  (project_id,owner_id,scene_id,shot_id,source_scene_version,source_shot_version,
   dramatic_intent,composition,performance_anchor,continuity_locks)
 VALUES (sh.project_id,auth.uid(),sh.scene_id,sh.id,sc.version,sh.version,
         sh.drama_function,sh.framing||' — '||sh.lens_rationale,
         sh.blocking,sh.continuity_constraints)
 ON CONFLICT(shot_id) DO UPDATE SET
  source_scene_version=excluded.source_scene_version,
  source_shot_version=excluded.source_shot_version, reviewed_at=NULL
 RETURNING id INTO fid;
 RETURN fid;
END $$;
REVOKE ALL ON FUNCTION public.fz_prepare_storyboard(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fz_prepare_storyboard(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fz_attach_storyboard(
 _frame_id uuid,_version integer,_path text,_hash text,_rights_note text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.storyboard_frames; v integer;
BEGIN
 SELECT * INTO f FROM public.storyboard_frames WHERE id=_frame_id FOR UPDATE;
 IF NOT FOUND OR NOT public.fz_owns_project(f.project_id) THEN RAISE EXCEPTION 'not_found'; END IF;
 IF f.version<>_version THEN RAISE EXCEPTION 'version_conflict'; END IF;
 IF _path NOT LIKE (auth.uid()::text||'/'||f.project_id::text||'/stills/'||f.shot_id::text||'/%')
   OR _hash !~ '^[0-9a-f]{64}$' OR length(btrim(coalesce(_rights_note,'')))<8
   THEN RAISE EXCEPTION 'invalid_image_reference'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='project-files' AND name=_path)
   THEN RAISE EXCEPTION 'private_object_missing'; END IF;
 UPDATE public.storyboard_frames SET image_path=_path,image_hash=_hash,rights_note=left(_rights_note,4000),
    reviewed_at=NULL WHERE id=_frame_id RETURNING version INTO v;
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.fz_attach_storyboard(uuid,integer,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fz_attach_storyboard(uuid,integer,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fz_review_storyboard(_frame_id uuid,_version integer)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.storyboard_frames; sh public.shots; sc public.scenes; v timestamptz;
BEGIN
 SELECT * INTO f FROM public.storyboard_frames WHERE id=_frame_id FOR UPDATE;
 IF NOT FOUND OR NOT public.fz_owns_project(f.project_id) THEN RAISE EXCEPTION 'not_found'; END IF;
 IF f.version<>_version THEN RAISE EXCEPTION 'version_conflict'; END IF;
 SELECT * INTO sh FROM public.shots WHERE id=f.shot_id AND archived_at IS NULL;
 SELECT * INTO sc FROM public.scenes WHERE id=f.scene_id AND archived_at IS NULL;
 IF sh.id IS NULL OR sc.id IS NULL OR sh.version<>f.source_shot_version
    OR sc.version<>f.source_scene_version THEN RAISE EXCEPTION 'shot_source_changed'; END IF;
 IF btrim(f.dramatic_intent)='' OR btrim(f.composition)='' OR
    btrim(f.performance_anchor)='' OR btrim(f.lighting)='' OR
    btrim(f.palette)='' OR btrim(f.continuity_locks)='' OR f.image_path IS NULL
    THEN RAISE EXCEPTION 'frame_incomplete'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='project-files' AND name=f.image_path)
    THEN RAISE EXCEPTION 'private_object_missing'; END IF;
 UPDATE public.storyboard_frames SET reviewed_at=now()
 WHERE id=f.id RETURNING reviewed_at INTO v;
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.fz_review_storyboard(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fz_review_storyboard(uuid,integer) TO authenticated;
