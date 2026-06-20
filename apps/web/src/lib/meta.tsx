import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type MetaResponse } from "./api";

const MetaContext = createContext<MetaResponse | null>(null);

export function MetaProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["meta"],
    queryFn: api.meta,
    staleTime: Infinity,
  });
  if (!data) {
    return (
      <div className="grid h-screen place-items-center text-muted" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }
  return <MetaContext.Provider value={data}>{children}</MetaContext.Provider>;
}

export function useMeta(): MetaResponse {
  const ctx = useContext(MetaContext);
  if (!ctx) throw new Error("useMeta must be used within MetaProvider");
  return ctx;
}

/** Disclaimer text by key, sourced from the server (versioned). */
export function useDisclaimer(key: string): string {
  const meta = useMeta();
  return meta.disclaimers[key] ?? "";
}
