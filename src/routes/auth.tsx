import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandMark, LangToggle } from "@/components/fz/AppShell";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in · FRAME ZERO كادر صفر" },
      { name: "description", content: "Sign in to your private FRAME ZERO film workspace." },
      { property: "og:title", content: "Sign in · FRAME ZERO" },
      { property: "og:description", content: "Access your private film projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

/** Only same-origin relative paths are allowed as post-login targets. */
function safePath(raw?: string) {
  if (!raw) return "/projects";
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin !== window.location.origin) return "/projects";
    return u.pathname + u.search;
  } catch {
    return "/projects";
  }
}

function AuthPage() {
  const { tx, t } = useI18n();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, ready } = useSession();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) navigate({ to: safePath(redirect), replace: true });
  }, [ready, user, redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error(tx({ en: "Password must be at least 8 characters", ar: "كلمة المرور 8 أحرف على الأقل" }));
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/projects", data: { display_name: name } },
        });
        if (error) throw error;
        setNotice(tx({ en: "Check your email to confirm your account, then sign in.", ar: "تحقق من بريدك لتأكيد الحساب ثم سجّل الدخول." }));
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setNotice(tx({ en: "If that email has an account, a reset link is on its way.", ar: "إن كان للبريد حساب، فرابط إعادة التعيين في الطريق." }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "lovable") => {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error(result.error.message ?? String(result.error));
  };

  return (
    <div className="min-h-screen bg-stage">
      <header className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
        <Link to="/" className="tap inline-flex items-center"><BrandMark /></Link>
        <LangToggle />
      </header>
      <main className="mx-auto max-w-md px-4 pt-8 pb-16">
        <div className="frame-corners shadow-frame rounded-md border border-border bg-surface p-6">
          <h1 className="font-display text-4xl">
            {mode === "signin" ? t("signIn") : mode === "signup" ? t("signUp") : tx({ en: "Reset password", ar: "إعادة تعيين كلمة المرور" })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {tx({ en: "Your projects are private to your account.", ar: "مشاريعك خاصة بحسابك وحدك." })}
          </p>

          {mode !== "forgot" && (
            <div className="mt-6 space-y-2">
              <Button type="button" variant="outline" className="w-full" onClick={() => oauth("google")}>
                {tx({ en: "Continue with Google", ar: "المتابعة عبر Google" })}
              </Button>
              <button type="button" className="lovable-auth-button w-full" onClick={() => oauth("lovable")}>
                Continue with Lovable
              </button>
              <div className="flex items-center gap-3 py-2 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {tx({ en: "or with email", ar: "أو بالبريد" })}
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <label className="block text-xs text-muted-foreground">
                {tx({ en: "Display name", ar: "الاسم الظاهر" })}
                <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </label>
            )}
            <label className="block text-xs text-muted-foreground">
              {tx({ en: "Email", ar: "البريد الإلكتروني" })}
              <Input className="mt-1" type="email" required dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            {mode !== "forgot" && (
              <label className="block text-xs text-muted-foreground">
                {tx({ en: "Password", ar: "كلمة المرور" })}
                <Input
                  className="mt-1"
                  type="password"
                  required
                  dir="ltr"
                  minLength={mode === "signup" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </label>
            )}
            {notice && <p className="rounded-md bg-champagne-dim p-3 text-sm text-champagne">{notice}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? t("loading") : mode === "signin" ? t("signIn") : mode === "signup" ? t("signUp") : tx({ en: "Send reset link", ar: "إرسال رابط" })}
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
            {mode === "signin" ? (
              <>
                <button className="tap text-champagne" onClick={() => setMode("signup")}>{t("signUp")}</button>
                <button className="tap text-muted-foreground" onClick={() => setMode("forgot")}>{tx({ en: "Forgot password?", ar: "نسيت كلمة المرور؟" })}</button>
              </>
            ) : (
              <button className="tap text-champagne" onClick={() => setMode("signin")}>{t("signIn")}</button>
            )}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/privacy" className="underline-offset-4 hover:underline">{tx({ en: "Privacy", ar: "الخصوصية" })}</Link>
          {" · "}
          <Link to="/rights" className="underline-offset-4 hover:underline">{tx({ en: "Rights", ar: "الحقوق" })}</Link>
        </p>
      </main>
    </div>
  );
}
