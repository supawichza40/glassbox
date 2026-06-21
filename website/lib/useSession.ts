"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearSession,
  getSession,
  setRole,
  type GlassboxSession,
  type Role,
} from "./auth";

/** Client hook over the seeded cookie session. Re-reads on focus so the role
 *  toggle and "Enter demo" reflect immediately across tabs. */
export function useSession() {
  const [session, setSession] = useState<GlassboxSession | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setSession(getSession());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  const switchRole = useCallback(
    (role: Role) => {
      setRole(role);
      refresh();
    },
    [refresh],
  );

  const signOut = useCallback(() => {
    clearSession();
    refresh();
  }, [refresh]);

  return { session, ready, switchRole, signOut, refresh };
}
