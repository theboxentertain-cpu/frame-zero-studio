import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Mode = Database["public"]["Enums"]["fz_mode"];

type SessionCtx = { user: User | null; ready: boolean; profile: Profile | null; mode: Mode };
const Ctx = createContext<SessionCtx>({
  user: null,
  ready: false,
  profile: null,
  mode: "filmmaker",
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const qc = useQueryClient();
  const identity = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let authEventSeen = false;
    const adopt = (next: User | null) => {
      if (identity.current !== (next?.id ?? null)) {
        void qc.cancelQueries();
        qc.clear();
      }
      identity.current = next?.id ?? null;
      setUser(next);
      setReady(true);
    };
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || authEventSeen) return;
      adopt(data.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED"
      ) {
        authEventSeen = true;
        adopt(session?.user ?? null);
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <Ctx.Provider
      value={{ user, ready, profile: profile ?? null, mode: profile?.mode ?? "filmmaker" }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useSession = () => useContext(Ctx);
