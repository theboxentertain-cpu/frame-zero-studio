import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "ar" | "en";
export type Bi = { en: string; ar: string };

const STORAGE_KEY = "fz.locale";

type I18nCtx = {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (l: Locale) => void;
  tx: (b: Bi) => string;
  t: (k: keyof typeof DICT) => string;
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Arabic is the flagship default; the stored choice is read after hydration.
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo<I18nCtx>(
    () => ({
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      tx: (b) => b[locale],
      t: (k) => DICT[k][locale],
    }),
    [locale, setLocale],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useI18n outside I18nProvider");
  return c;
}

export const DICT = {
  brand: { en: "MIZENZA", ar: "ميزنزا" },
  studio: { en: "The Filmmaker's Studio", ar: "استوديو صانع الأفلام" },
  philosophy: { en: "Every shot has a reason.", ar: "لكل لقطة سبب." },
  tagline: { en: "From one thought to the final cut.", ar: "من فكرة واحدة إلى النسخة النهائية." },
  signIn: { en: "Sign in", ar: "تسجيل الدخول" },
  signUp: { en: "Create account", ar: "إنشاء حساب" },
  signOut: { en: "Sign out", ar: "تسجيل الخروج" },
  save: { en: "Save", ar: "حفظ" },
  saving: { en: "Saving…", ar: "جارٍ الحفظ…" },
  saved: { en: "Saved", ar: "تم الحفظ" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  archive: { en: "Archive", ar: "أرشفة" },
  restore: { en: "Restore", ar: "استعادة" },
  deleteForever: { en: "Delete permanently", ar: "حذف نهائي" },
  duplicate: { en: "Duplicate", ar: "نسخ" },
  open: { en: "Open", ar: "فتح" },
  add: { en: "Add", ar: "إضافة" },
  lock: { en: "Lock (written)", ar: "قفل (مكتوب)" },
  unlock: { en: "Unlock", ar: "إلغاء القفل" },
  locked: { en: "Locked", ar: "مقفل" },
  draft: { en: "Draft", ar: "مسودة" },
  review: { en: "In review", ar: "قيد المراجعة" },
  archived: { en: "Archived", ar: "مؤرشف" },
  showArchived: { en: "Show archived", ar: "عرض المؤرشف" },
  hideArchived: { en: "Hide archived", ar: "إخفاء المؤرشف" },
  loading: { en: "Loading…", ar: "جارٍ التحميل…" },
  unsaved: { en: "Unsaved changes", ar: "تغييرات غير محفوظة" },
  conflict: {
    en: "This record was changed elsewhere (newer version). Your draft is kept — load the latest to continue.",
    ar: "تم تعديل هذا السجل في مكان آخر (نسخة أحدث). مسودتك محفوظة هنا — حمّل الأحدث للمتابعة.",
  },
  loadLatest: { en: "Load latest", ar: "تحميل الأحدث" },
  errorGeneric: { en: "Something went wrong", ar: "حدث خطأ ما" },
  library: { en: "Library", ar: "المكتبة" },
  newFilm: { en: "New film", ar: "فيلم جديد" },
  account: { en: "Account", ar: "الحساب" },
  required: { en: "Required", ar: "مطلوب" },
  missingFields: { en: "Missing required fields", ar: "حقول مطلوبة ناقصة" },
  complete: { en: "Complete", ar: "مكتمل" },
  drift: { en: "Source changed since last save", ar: "تغيّر المصدر منذ آخر حفظ" },
  proposalOnly: {
    en: "Everything here is a written proposal by you — nothing is generated or invented.",
    ar: "كل ما هنا مقترح مكتوب منك — لا يتم توليد أو اختلاق أي شيء.",
  },
  notOperational: { en: "Not operational yet", ar: "غير مفعّل بعد" },
  version: { en: "v", ar: "ن" },
  confirmDelete: {
    en: "Delete permanently? This cannot be undone.",
    ar: "حذف نهائي؟ لا يمكن التراجع عن ذلك.",
  },
} satisfies Record<string, Bi>;
