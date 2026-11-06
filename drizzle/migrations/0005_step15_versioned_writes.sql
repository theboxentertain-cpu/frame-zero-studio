-- Enforce optimistic writes for all human-authored storyboard fields.
REVOKE UPDATE (dramatic_intent,composition,performance_anchor,lighting,palette,
  continuity_locks,director_notes,archived_at)
ON public.storyboard_frames FROM authenticated;

CREATE OR REPLACE FUNCTION public.fz_save_storyboard(
 _frame_id uuid,_version integer,_notes jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.storyboard_frames; k text; out_version integer;
BEGIN
 SELECT * INTO f FROM public.storyboard_frames WHERE id=_frame_id FOR UPDATE;
 IF NOT FOUND OR NOT public.fz_owns_project(f.project_id) THEN RAISE EXCEPTION 'not_found'; END IF;
 IF f.version<>_version THEN RAISE EXCEPTION 'version_conflict'; END IF;
 IF jsonb_typeof(_notes)<>'object' THEN RAISE EXCEPTION 'invalid_notes'; END IF;
 FOR k IN SELECT jsonb_object_keys(_notes) LOOP
  IF k NOT IN ('dramatic_intent','composition','performance_anchor','lighting',
               'palette','continuity_locks','director_notes')
    THEN RAISE EXCEPTION 'unknown_field'; END IF;
  IF jsonb_typeof(_notes->k)<>'string' THEN RAISE EXCEPTION 'invalid_field_type'; END IF;
 END LOOP;
 UPDATE public.storyboard_frames SET
   dramatic_intent=left(coalesce(_notes->>'dramatic_intent',dramatic_intent),4000),
   composition=left(coalesce(_notes->>'composition',composition),4000),
   performance_anchor=left(coalesce(_notes->>'performance_anchor',performance_anchor),4000),
   lighting=left(coalesce(_notes->>'lighting',lighting),4000),
   palette=left(coalesce(_notes->>'palette',palette),4000),
   continuity_locks=left(coalesce(_notes->>'continuity_locks',continuity_locks),4000),
   director_notes=left(coalesce(_notes->>'director_notes',director_notes),4000),
   reviewed_at=NULL
 WHERE id=_frame_id RETURNING version INTO out_version;
 RETURN out_version;
END $$;
REVOKE ALL ON FUNCTION public.fz_save_storyboard(uuid,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fz_save_storyboard(uuid,integer,jsonb) TO authenticated;

-- Reject spoofed scene/shot links even when both records belong to the same owner.
CREATE OR REPLACE FUNCTION public.fz_storyboard_validate_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sh public.shots; sc public.scenes;
BEGIN
 SELECT * INTO sh FROM public.shots WHERE id=NEW.shot_id AND project_id=NEW.project_id AND archived_at IS NULL;
 SELECT * INTO sc FROM public.scenes WHERE id=NEW.scene_id AND project_id=NEW.project_id AND archived_at IS NULL;
 IF sh.id IS NULL OR sc.id IS NULL OR sh.scene_id<>sc.id
    OR sh.version<>NEW.source_shot_version OR sc.version<>NEW.source_scene_version
    OR sh.owner_id<>NEW.owner_id THEN
   RAISE EXCEPTION 'invalid_storyboard_source';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fz_storyboard_validate_source() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER storyboard_source BEFORE INSERT ON public.storyboard_frames
 FOR EACH ROW EXECUTE FUNCTION public.fz_storyboard_validate_source();
