import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/fz/AppShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password · FRAME ZERO" },
      { name: "description", content: "Choose a new password for your FRAME ZERO account." },
      { property: "og:title", content: "Set a new password · FRAME ZERO" },
      { property: "og:description", content: "Password recovery for FRAME ZERO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { tx, t } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setRecovery(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("saved"));
    navigate({ to: "/projects", replace: true });
  };

  return (
    <div className="min-h-screen bg-stage px-4 pt-16">
      <div className="mx-auto max-w-md rounded-md border border-border bg-surface p-6">
        <BrandMark />
        <h1 className="mt-6 font-display text-3xl">{tx({ en: "Set a new password", ar: "اختر كلمة مرور جديدة" })}</h1>
        {!recovery ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {tx({ en: "Open this page from the reset link in your email.", ar: "افتح هذه الصفحة من رابط إعادة التعيين في بريدك." })}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <Input type="password" dir="ltr" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <Button className="w-full" disabled={busy}>{busy ? t("saving") : t("save")}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
