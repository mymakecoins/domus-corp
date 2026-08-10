import { Badge } from "@domus/ui";
import React from "react";

export type FreshnessState = "FRESH" | "STALE" | "UNKNOWN";

const textMap: Record<FreshnessState, string> = {
  FRESH: "Atualizado",
  STALE: "Desatualizado",
  UNKNOWN: "Frescor desconhecido",
};

export function SourceFreshnessBadge({ freshness }: { freshness: FreshnessState }) {
  return <Badge data-freshness={freshness}>{textMap[freshness] || textMap.UNKNOWN}</Badge>;
}
