import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/fz/PageHeader";
import { useI18n } from "@/lib/i18n";
import {
  FIELDS, current, fetchStoryboard, prepareShot, saveDirection, importReference,
  privateSignedImage, reviewFrame, downloadStoryboardManifest,
  type Frame, type Shot, type DirectionField,
} from "./data";

const Q = (p:string,s:string) => ["storyboard",p,s] as const;

export function StillStudio({projectId,sceneId}:{projectId:string;sceneId:string}) {
  const {tx} = useI18n();
  const query = useQuery({queryKey:Q(projectId,sceneId),
    queryFn:()=>fetchStoryboard(projectId,sceneId)});
  const qc=useQueryClient();
  const [busy,setBusy]=useState(false);
  const refresh=()=>qc.invalidateQueries({queryKey:Q(projectId,sceneId)});
  if(query.isLoading) return <LoadingBlock/>;
  if(query.error) return <p role="alert" className="text-destructive p-3">
    {String(query.error.message)}
    <span className="block text-muted-foreground text-sm mt-2">
      {tx({en:"This requires the reviewed Step 15 database migration. No images have been generated.",
           ar:"تتطلب هذه الصفحة ترحيل قاعدة بيانات المرحلة 15 بعد مراجعته. لم تُنشأ صور بالذكاء الاصطناعي."})}
    </span></p>;
  const {shots=[],frames=[],sceneVersion=0}=query.data??{};
  const prepared=shots.filter(s=>frames.some(f=>f.shot_id===s.id && current(f,s,sceneVersion))).length;
  const reviewed=shots.filter(s=>frames.some(f=>f.shot_id===s.id &&
    current(f,s,sceneVersion) && f.reviewed_at)).length;
  async function prepareAll() {
    setBusy(true);
    try {
      for(const shot of shots) {
        const exists=frames.find(f=>f.shot_id===shot.id);
        if(!exists || !current(exists,shot,sceneVersion)) await prepareShot(shot.id);
      }
      await refresh();
      toast.success(tx({en:"Shot records prepared. No images generated.",
        ar:"تم تجهيز سجلات اللقطات. لم يتم توليد صور."}));
    }catch(e){toast.error(String(e instanceof Error?e.message:e));}
    finally{setBusy(false);}
  }
  return <section className="space-y-5">
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {tx({en:"Cinematic Still Studio · Step 15",ar:"استوديو الصور السينمائية · المرحلة 15"})}
      </p>
      <h2 className="font-display text-2xl">
        {tx({en:"One intention. One approved reference per shot.",
             ar:"غاية واحدة. مرجع مصوّر معتمد لكل لقطة."})}
      </h2>
      <p className="text-sm text-muted-foreground">
        {tx({en:"Prepare each approved shot, direct its composition and import a licensed image. Images are NOT AI generated. Production stills and the final-cut gate remain unavailable.",
             ar:"جهّز كل لقطة معتمدة، وحدّد تكوينها، واستورد صورة تملك حق استخدامها. الصور ليست مولّدة بالذكاء الاصطناعي. إنتاج الصور وبوابة الفيلم النهائي غير متاحين بعد."})}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="partial">{prepared}/{shots.length} {tx({en:"prepared",ar:"مجهّزة"})}</Badge>
        <Badge variant={reviewed===shots.length&&shots.length>0?"live":"partial"}>
          {reviewed}/{shots.length} {tx({en:"references reviewed",ar:"مراجع تمت مراجعتها"})}
        </Badge>
        <Badge variant="roadmap">{tx({en:"AI generation: not connected",ar:"التوليد بالذكاء الاصطناعي: غير متصل"})}</Badge>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button variant="frame" disabled={busy || shots.length===0 || prepared===shots.length}
          onClick={prepareAll}>
          {busy?tx({en:"Preparing…",ar:"جارٍ التجهيز…"}):
            tx({en:"Prepare shot references",ar:"تجهيز مراجع اللقطات"})}
        </Button>
        <Button variant="outline" disabled={shots.length===0}
          onClick={()=>downloadStoryboardManifest(projectId,sceneId,frames,shots)}>
          {tx({en:"Export shot handoff JSON",ar:"تصدير تعليمات اللقطات JSON"})}
        </Button>
      </div>
      {shots.length===0 && <p className="text-muted-foreground">
        {tx({en:"Create and approve shot plans in Shot Lab first.",
             ar:"أنشئ خطط اللقطات واعتمدها في معمل اللقطات أولًا."})}
      </p>}
    </div>
    {shots.map((shot,i)=>{
      const frame=frames.find(f=>f.shot_id===shot.id);
      return <div key={shot.id} className="rounded-lg border border-border bg-surface p-4 space-y-2">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <p className="text-xs text-muted-foreground">
              {tx({en:"SHOT",ar:"لقطة"})} {shot.shot_number || i+1}
            </p>
            <h3 className="font-display text-xl">{shot.drama_function ||
              tx({en:"Unspecified dramatic purpose",ar:"الغاية الدرامية غير محددة"})}</h3>
            <p className="text-sm text-muted-foreground" dir="auto">
              {shot.framing} · {shot.lens_rationale}
            </p>
          </div>
          {!frame?<Badge variant="roadmap">{tx({en:"Not prepared",ar:"غير مجهّزة"})}</Badge>:
          <Badge variant={!current(frame,shot,sceneVersion)?"partial":frame.reviewed_at?"live":"partial"}>
            {!current(frame,shot,sceneVersion)
              ? tx({en:"Source changed",ar:"تغير المصدر"})
              : frame.reviewed_at
                ? tx({en:"Manual reference reviewed",ar:"تمت مراجعة المرجع اليدوي"})
                : tx({en:"Draft / awaiting review",ar:"مسودة / تنتظر المراجعة"})}
          </Badge>}
        </div>
        {frame ? <FrameCard key={frame.id} frame={frame} shot={shot}
          sceneVersion={sceneVersion} onUpdated={refresh}/>:
          <p className="text-sm text-muted-foreground">
            {tx({en:"Prepare this shot to begin its storyboard.",ar:"جهّز هذه اللقطة لبدء لوحتها المصوّرة."})}
          </p>}
      </div>;
    })}
  </section>;
}

function FrameCard({frame,shot,sceneVersion,onUpdated}:{
  frame:Frame; shot:Shot; sceneVersion:number; onUpdated:()=>Promise<unknown>;
}) {
  const {tx,locale}=useI18n();
  const [draft,setDraft]=useState<Partial<Frame>>(()=>({ ...frame }));
  const [dirty,setDirty]=useState(false);
  const [busy,setBusy]=useState(false);
  const [conflict,setConflict]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const [rights,setRights]=useState(frame.rights_note||"");
  const [attested,setAttested]=useState(false);
  const [imageUrl,setImageUrl]=useState<string|null>(null);
  const [imageError,setImageError]=useState("");
  useEffect(()=>{
    if(!dirty){setDraft({...frame});setRights(frame.rights_note||"");}
  },[frame,dirty]);
  useEffect(()=>{
    let active=true;
    setImageUrl(null);setImageError("");
    if(!frame.image_path) return;
    privateSignedImage(frame.image_path).then(url=>{
      if(active) setImageUrl(url);
    }).catch(err=>{if(active) setImageError(String(err));});
    return ()=>{active=false;};
  },[frame.image_path]);
  const fresh=current(frame,shot,sceneVersion);
  const present=(key:DirectionField)=>String(draft[key] ?? "");
  const update=(key:DirectionField,val:string)=>{
    setDraft(d=>({...d,[key]:val}));setDirty(true);
  };
  function report(err:unknown) {
    const message=String(err instanceof Error?err.message:err);
    if(message.includes("version_conflict"))setConflict(true);
    toast.error(message);
  }
  async function save() {
    setBusy(true);
    try {
      const payload=Object.fromEntries(FIELDS.map(f=>[f.name,present(f.name)]));
      await saveDirection(frame,payload);
      setDirty(false);setConflict(false);await onUpdated();
      toast.success(tx({en:"Directing notes saved",ar:"تم حفظ ملاحظات الإخراج"}));
    }catch(err){report(err);}finally{setBusy(false);}
  }
  async function upload() {
    if(!file||!attested){toast.error(tx({en:"Select an image and confirm its usage rights.",
      ar:"اختر صورة وأكّد حقك في استخدامها."}));return;}
    setBusy(true);
    try {
      await importReference(frame,file,rights);
      setFile(null);setAttested(false);setDirty(false);await onUpdated();
      toast.success(tx({en:"Private reference imported. Not AI-generated.",
        ar:"تم استيراد المرجع بشكل خاص. لم يتم توليده بالذكاء الاصطناعي."}));
    }catch(err){report(err);}finally{setBusy(false);}
  }
  async function review() {
    setBusy(true);
    try {
      await reviewFrame(frame);await onUpdated();
      toast.success(tx({en:"Director reviewed the imported reference.",
        ar:"راجع المخرج المرجع المستورد."}));
    }catch(err){report(err);}finally{setBusy(false);}
  }
  return <div className="space-y-4">
    {conflict&&<div role="alert" className="border border-destructive rounded p-3 text-sm">
      {tx({en:"A newer version exists. Your unsaved draft remains on screen. Copy it before reloading.",
          ar:"هناك نسخة أحدث. مسودتك غير المحفوظة ما زالت ظاهرة. انسخها قبل إعادة التحميل."})}
      <Button size="sm" variant="outline" onClick={()=>{setDirty(false);setConflict(false);onUpdated();}}>
        {tx({en:"Load latest (discard draft)",ar:"تحميل الأحدث (حذف المسودة)"})}
      </Button>
    </div>}
    {!fresh&&<p role="alert" className="text-sm text-destructive">
      {tx({en:"The shot or scene changed. Re-prepare from the approved plan before reviewing.",
           ar:"تغيرت اللقطة أو المشهد. أعد التجهيز من الخطة المعتمدة قبل المراجعة."})}
    </p>}
    <div className="grid gap-3 md:grid-cols-2">
      {FIELDS.map(field=><label key={field.name} className="text-sm text-muted-foreground">
        <span className="block mb-1">{field[locale]}</span>
        <Textarea dir="auto" rows={field.name==="director_notes"?4:2}
          value={present(field.name)} maxLength={4000} disabled={busy||!fresh}
          onChange={e=>update(field.name,e.target.value)} />
      </label>)}
    </div>
    <Button variant="frame" onClick={save} disabled={busy||!fresh||!dirty}>
      {tx({en:"Save direction",ar:"حفظ التوجيه"})}
    </Button>
    <div className="border-t border-border pt-4 space-y-3">
      <h4 className="font-display text-lg">
        {tx({en:"Private image reference",ar:"المرجع المصوّر الخاص"})}
      </h4>
      {imageUrl&&<img src={imageUrl} alt={tx({en:"Imported approved-rights storyboard reference",
        ar:"مرجع لوحة مصورة مستورد مع بيان حقوق الاستخدام"})}
        loading="lazy" className="rounded max-w-full max-h-80 object-contain bg-black" />}
      {imageError&&<p role="alert" className="text-destructive text-sm">{imageError}</p>}
      <p className="text-xs text-muted-foreground">
        {tx({en:"Import a JPEG, PNG or WebP you are allowed to use. The browser re-encodes to WebP to remove metadata. Stored privately; never published as generated art.",
             ar:"استورد JPEG أو PNG أو WebP تملك حق استخدامها. يعيد المتصفح ترميزها إلى WebP لإزالة البيانات الوصفية. تُحفظ بشكل خاص ولا تُعرض كفن مولّد."})}
      </p>
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!fresh}
        className="block max-w-full text-sm" aria-label={tx({en:"Select reference image",ar:"اختر الصورة المرجعية"})}
        onChange={e=>setFile(e.currentTarget.files?.[0]||null)}/>
      <label className="block text-sm text-muted-foreground">
        {tx({en:"Rights and provenance note",ar:"ملاحظة الحقوق ومصدر الصورة"})}
        <Textarea dir="auto" rows={2} maxLength={4000} value={rights}
          onChange={e=>setRights(e.target.value)}
          placeholder={tx({en:"Original photograph I own / licensed reference...",
            ar:"صورة أصلية أملكها / مرجع مرخص..."})}/>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={attested} onChange={e=>setAttested(e.target.checked)}/>
        {tx({en:"I confirm that I have the rights or permission to use this reference.",
            ar:"أؤكد أنني أملك حقوق أو إذن استخدام هذا المرجع."})}
      </label>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" disabled={busy||!fresh||!file||!attested||rights.trim().length<8}
          onClick={upload}>{tx({en:"Import private reference",ar:"استيراد المرجع الخاص"})}</Button>
        <Button variant="frame" disabled={busy||!fresh||dirty||!frame.image_path||!!frame.reviewed_at}
          onClick={review}>{tx({en:"Review this frame",ar:"مراجعة هذا الإطار"})}</Button>
      </div>
    </div>
  </div>;
}
