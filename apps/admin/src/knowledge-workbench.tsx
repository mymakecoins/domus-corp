import { Alert, AlertDescription, AlertTitle, Badge, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@domus/ui";
import React from "react";

export type WorkbenchSession = { state: "AUTHENTICATED"; workspaceName: string } | { state: "UNAVAILABLE"; reason: string };
export type KnowledgeAssetRow = { assetId: string; name: string; source: string; version: number; classification: "public" | "internal" | "confidential" | "restricted"; freshness: "FRESH" | "STALE" | "UNKNOWN"; governance: "EFFECTIVE" | "PENDING" | "CONFLICTED"; citations: number };
export type WorkbenchClient = { listAssets(): Promise<readonly KnowledgeAssetRow[]> };
const freshness: Record<KnowledgeAssetRow["freshness"], string> = { FRESH: "Atualizado", STALE: "Desatualizado", UNKNOWN: "Frescor desconhecido" };
const governance: Record<KnowledgeAssetRow["governance"], string> = { EFFECTIVE: "Vigente", PENDING: "Pendente", CONFLICTED: "Conflito" };

export function KnowledgeWorkbench({ session, client }: { session: WorkbenchSession; client: WorkbenchClient }) {
  const [assets, setAssets] = React.useState<readonly KnowledgeAssetRow[]>([]);
  const [error, setError] = React.useState<string>();
  React.useEffect(() => { if (session.state === "AUTHENTICATED") void client.listAssets().then(setAssets).catch(() => setError("Não foi possível verificar o conhecimento com segurança.")); }, [client, session.state]);
  if (session.state !== "AUTHENTICATED") return <main><Alert><AlertTitle>Knowledge Workbench indisponível</AlertTitle><AlertDescription>{session.reason} Nenhum ativo foi carregado.</AlertDescription></Alert></main>;
  return <main><header><p>Workspace: {session.workspaceName}</p><h1>Knowledge Workbench</h1><p>Ativos governados, frescor e citações autorizadas.</p></header>{error && <Alert><AlertTitle>Verificação indisponível</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}<Card><CardHeader><CardTitle>Ativos de conhecimento</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Ativo</TableHead><TableHead>Fonte</TableHead><TableHead>Versão</TableHead><TableHead>Classificação</TableHead><TableHead>Governança</TableHead><TableHead>Frescor</TableHead><TableHead>Citações</TableHead></TableRow></TableHeader><TableBody>{assets.map(asset => <TableRow key={asset.assetId}><TableCell>{asset.name}</TableCell><TableCell>{asset.source}</TableCell><TableCell>{asset.version}</TableCell><TableCell><Badge>{asset.classification}</Badge></TableCell><TableCell><Badge>{governance[asset.governance]}</Badge></TableCell><TableCell><Badge>{freshness[asset.freshness]}</Badge></TableCell><TableCell>{asset.citations > 0 ? `${asset.citations} evidência(s)` : "Sem citações"}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></main>;
}
