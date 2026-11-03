import type { FieldDef, Option } from "@/components/fz/RecordEditor";
import { STATUS_OPTIONS } from "@/components/fz/RecordEditor";
import type { AnyRow, TableName } from "@/lib/records";
const text = (
  key: string,
  en: string,
  ar: string,
  type: FieldDef["type"] = "textarea",
): FieldDef => ({ key, label: { en, ar }, type });
const CATEGORY_AR: Record<string, string> = {
  director: "مخرج",
  film: "فيلم",
  acting: "أداء",
  color: "لون",
  music: "موسيقى",
  other: "أخرى",
  wardrobe: "ملابس",
  props: "إكسسوارات",
  hair_makeup: "شعر ومكياج",
  eyeline: "اتجاه النظرة",
  time: "وقت",
  weather: "طقس",
  sound: "صوت",
  cast: "ممثلون",
  crew: "طاقم",
  location: "مكان",
  equipment: "معدات",
  post: "ما بعد الإنتاج",
  rights: "حقوق",
};
const options = (entries: string[]): Option[] =>
  entries.map((value) => ({
    value,
    label: { en: value.replaceAll("_", " "), ar: CATEGORY_AR[value] ?? value },
  }));
const select = (key: string, en: string, ar: string, values: Option[]): FieldDef => ({
  key,
  label: { en, ar },
  type: "select",
  options: values,
});
const ref = (key: string, en: string, ar: string, table: TableName, optional = true): FieldDef => ({
  key,
  label: { en, ar },
  type: "ref",
  ref: {
    table,
    optional,
    labelOf: (r: AnyRow) => String(r["title"] || r["name"] || r["shot_number"] || r.id),
  },
});
const status = select("status", "Status", "الحالة", STATUS_OPTIONS);
export const fields: Record<
  | "briefs"
  | "interpretations"
  | "creative_references"
  | "treatments"
  | "scenes"
  | "characters"
  | "locations"
  | "voice_profiles"
  | "dialogue_lines"
  | "performance_plans"
  | "shots"
  | "continuity_notes"
  | "budget_lines",
  FieldDef[]
> = {
  briefs: [
    text("source_facts", "Source facts", "حقائق المصدر"),
    text("proposed_interpretation", "Proposed interpretation", "القراءة المقترحة"),
    text("approved_decisions", "Director-approved decisions", "قرارات المخرج المعتمدة"),
    text("notes", "Notes", "ملاحظات"),
  ],
  interpretations: [
    text("direction", "Direction", "الاتجاه", "text"),
    text("selected", "Selected proposal", "مقترح مختار", "boolean"),
    text("objective", "Objective", "الهدف"),
    text("obstacle", "Obstacle", "العائق"),
    text("stakes", "Stakes", "الرهان"),
    text("camera_logic", "Motivated camera logic", "منطق الكاميرا ودوافعها"),
    text("notes", "Notes", "ملاحظات"),
    status,
  ],
  creative_references: [
    select(
      "kind",
      "Reference type",
      "نوع المرجع",
      options(["director", "film", "acting", "color", "music", "other"]),
    ),
    text("source_title", "Reference title", "اسم المرجع", "text"),
    text("admired_attributes", "Selected attributes", "السمات المختارة"),
    text("original_constraint", "Original artistic constraint", "قيد فني أصلي"),
    text("converted", "Converted by the director", "حوّله المخرج", "boolean"),
    text("notes", "Notes", "ملاحظات"),
  ],
  treatments: [
    select("level", "Level", "المستوى", [
      { value: "film", label: { en: "Film", ar: "فيلم" } },
      { value: "sequence", label: { en: "Sequence", ar: "متتالية" } },
      { value: "scene", label: { en: "Scene", ar: "مشهد" } },
    ]),
    ref("parent_id", "Parent treatment", "المعالجة الأم", "treatments"),
    ref("scene_id", "Scene", "المشهد", "scenes"),
    text("title", "Title", "العنوان", "text"),
    text("summary", "Summary", "الملخص"),
    text("acting_intention", "Acting intention", "نية الأداء"),
    text("camera_intention", "Camera intention", "نية الكاميرا"),
    text("sound_intention", "Sound intention", "نية الصوت"),
    text("location_intention", "Location intention", "نية المكان"),
    text("continuity_intention", "Continuity intention", "نية الاستمرارية"),
    text("sort_order", "Order", "الترتيب", "number"),
    status,
  ],
  scenes: [
    text("scene_number", "Scene number", "رقم المشهد", "number"),
    text("title", "Title", "العنوان", "text"),
    text("act", "Act", "الفصل", "text"),
    text("synopsis", "Synopsis", "الملخص"),
    text("dramatic_purpose", "Dramatic purpose", "الغاية الدرامية"),
    text("turning_point", "Turning point", "نقطة التحول"),
    text("time_of_day", "Time of day", "وقت اليوم", "text"),
    ref("location_id", "Location", "المكان", "locations"),
    status,
  ],
  characters: [
    text("name", "Character name", "اسم الشخصية", "text"),
    text("story_role", "Story role", "الدور في القصة"),
    text("identity", "Individual identity", "هوية الشخصية"),
    text("age_range", "Age range", "الفئة العمرية", "text"),
    text("appearance", "Individually specified appearance", "الملامح الفردية"),
    text(
      "regional_background",
      "Regional background (separate from appearance)",
      "الخلفية الإقليمية (منفصلة عن الملامح)",
    ),
    select("likeness_permission", "Likeness permission", "إذن استخدام الملامح", [
      {
        value: "fictional_original",
        label: { en: "Original fictional character", ar: "شخصية خيالية أصلية" },
      },
      { value: "consent_pending", label: { en: "Consent pending", ar: "الموافقة معلقة" } },
      { value: "written_consent", label: { en: "Written consent", ar: "موافقة مكتوبة" } },
      { value: "not_permitted", label: { en: "Not permitted", ar: "غير مسموح" } },
    ]),
    text("rights_notes", "Rights evidence and notes", "أدلة الحقوق وملاحظاتها"),
  ],
  locations: [
    text("name", "World bible name", "اسم مرجع العالم", "text"),
    text("governorate", "Governorate", "المحافظة", "text"),
    text("district", "District", "الحي", "text"),
    text("place", "Place", "المكان", "text"),
    text("period_year", "Period / year", "الفترة / السنة", "text"),
    text("architecture", "Architecture", "العمارة"),
    text("interiors", "Interiors", "المساحات الداخلية"),
    text("props", "Props", "الإكسسوارات"),
    text("sound_profile", "Regional sound", "صوت المنطقة"),
    text("evidence_notes", "Evidence and source notes", "الأدلة وملاحظات المصدر"),
  ],
  voice_profiles: [
    ref("character_id", "Character", "الشخصية", "characters", false),
    text("dialect", "Specific dialect", "اللهجة المحددة"),
    text("pronunciation_notes", "Pronunciation", "النطق"),
    text("speech_register", "Speech register", "مستوى الكلام"),
    text("code_switching", "Code switching", "تبديل اللغات"),
    select("voice_permission", "Voice permission", "إذن الصوت", [
      { value: "none", label: { en: "No permission", ar: "لا إذن" } },
      { value: "pending", label: { en: "Pending", ar: "معلق" } },
      { value: "written_consent", label: { en: "Written consent", ar: "موافقة مكتوبة" } },
    ]),
    text("source_notes", "Source and permission evidence", "المصدر وأدلة الإذن"),
  ],
  dialogue_lines: [
    ref("scene_id", "Scene", "المشهد", "scenes", false),
    ref("character_id", "Character", "الشخصية", "characters"),
    text("sort_order", "Order", "الترتيب", "number"),
    text("line_text", "Dialogue (Egyptian Arabic welcome)", "الحوار (اكتب بالمصري)"),
    text("tactic", "Playable tactic", "التكتيك القابل للأداء"),
    text("pause_notes", "Pauses", "السكتات"),
    text("overlap_notes", "Overlap", "تداخل الكلام"),
    text("code_switching", "Code switching", "تبديل اللغات"),
    text("source_notes", "Source notes", "ملاحظات المصدر"),
  ],
  performance_plans: [
    ref("scene_id", "Scene", "المشهد", "scenes", false),
    ref("character_id", "Character", "الشخصية", "characters", false),
    text("objective", "Character objective", "هدف الشخصية"),
    text("obstacle", "Obstacle", "العائق"),
    text("playable_tactic", "Playable tactic", "التكتيك القابل للأداء"),
    text("partner_cue", "Partner cue", "إشارة الشريك"),
    text("listening_reaction", "Listening and reaction", "الاستماع ورد الفعل"),
    text("physical_action", "Physical action", "الفعل الجسدي"),
    text("beats", "Performance beats", "وحدات الأداء"),
  ],
  shots: [
    text("shot_number", "Shot number", "رقم اللقطة", "text"),
    text("sort_order", "Order", "الترتيب", "number"),
    text("drama_function", "Dramatic function", "الوظيفة الدرامية"),
    text("subject", "Subject", "موضوع اللقطة"),
    text("framing", "Framing", "التكوين"),
    text("lens_rationale", "Lens rationale", "مبرر العدسة"),
    text("movement_trigger", "Movement trigger", "دافع الحركة"),
    text("movement_end", "Movement end", "نهاية الحركة"),
    text("blocking", "Blocking", "توزيع الحركة"),
    text("duration_sec", "Duration in seconds", "المدة بالثواني", "number"),
    text("editing_reason", "Editing reason", "سبب القطع"),
    text("continuity_constraints", "Continuity constraints", "قيود الاستمرارية"),
    text("retake_notes", "Retake notes", "ملاحظات الإعادة"),
  ],
  continuity_notes: [
    ref("scene_id", "Scene", "المشهد", "scenes"),
    select(
      "category",
      "Category",
      "الفئة",
      options(["wardrobe", "props", "hair_makeup", "eyeline", "time", "weather", "sound", "other"]),
    ),
    text("note", "Continuity note", "ملاحظة الاستمرارية"),
  ],
  budget_lines: [
    select(
      "category",
      "Category",
      "الفئة",
      options(["cast", "crew", "location", "equipment", "post", "music", "rights", "other"]),
    ),
    text("description", "Description", "الوصف", "text"),
    text("quantity", "Quantity", "الكمية", "number"),
    text("unit_cost", "Unit cost", "تكلفة الوحدة", "number"),
    text("currency", "Currency", "العملة", "text"),
    text("notes", "Notes", "ملاحظات"),
  ],
} satisfies Partial<Record<TableName, FieldDef[]>>;
// Scene/character assignments define a performance plan's identity.
for (const table of ["voice_profiles", "performance_plans", "dialogue_lines"] as const)
  for (const f of fields[table]) if (f.type === "ref" && !f.ref?.optional) f.createOnly = true;
