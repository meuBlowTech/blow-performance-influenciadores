import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/custo-influencer/integrations/supabase/client";
import type { AppRole } from "@/custo-influencer/lib/db-types";

interface AuthState {
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  userLabel: string;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRoles = async (uid: string) => {
      const { data } = await supabase.rpc("get_my_roles" as never);
      if (!active) return;
      const list = (data as { role?: AppRole }[] | AppRole[] | null) ?? [];
      const parsed: AppRole[] = Array.isArray(list)
        ? list.map((r) => (typeof r === "string" ? r : (r.role as AppRole))).filter(Boolean)
        : [];
      setRoles(parsed);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) loadRoles(u.id).finally(() => active && setLoading(false));
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setTimeout(() => {
          loadRoles(u.id);
        }, 0);
      } else {
        setRoles([]);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userLabel =
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    "Usuário";

  return { user, roles, loading, userLabel };
}

export function canCreateEdit(roles: AppRole[]) {
  return roles.includes("Marketing");
}
export function canPay(roles: AppRole[]) {
  return roles.includes("Financeiro") || roles.includes("Marketing");
}
export function canViewHistorico(roles: AppRole[]) {
  return roles.includes("Financeiro") || roles.includes("Marketing");
}
export function isAdmin(roles: AppRole[]) {
  // Marketing acts as admin to manage roles in this MVP
  return roles.includes("Marketing");
}
