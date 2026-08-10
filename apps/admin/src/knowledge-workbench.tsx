import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@domus/ui";
import React from "react";
import { SourceFreshnessBadge } from "./source-freshness-badge.js";

export type WorkbenchSession =
  | { state: "AUTHENTICATED"; workspaceName: string }
  | { state: "UNAVAILABLE"; reason: string };

export type KnowledgeAssetRow = {
  assetId: string;
  name: string;
  source: string;
  version: number;
  classification: "public" | "internal" | "confidential" | "restricted";
  freshness: "FRESH" | "STALE" | "UNKNOWN";
  governance: "EFFECTIVE" | "PENDING" | "CONFLICTED";
  citations: number;
};

export type WorkbenchClient = {
  listAssets(): Promise<readonly KnowledgeAssetRow[]>;
  transition?(assetId: string, action: "approve" | "reject", justification: string): Promise<void>;
};

const governanceLabels: Record<KnowledgeAssetRow["governance"], string> = {
  EFFECTIVE: "Vigente",
  PENDING: "Pendente",
  CONFLICTED: "Conflito",
};

export function KnowledgeWorkbench({ session, client }: { session: WorkbenchSession; client: WorkbenchClient }) {
  const [assets, setAssets] = React.useState<readonly KnowledgeAssetRow[]>([]);
  const [error, setError] = React.useState<string>();
  const [sourceFilter, setSourceFilter] = React.useState<string>("ALL");
  const [classificationFilter, setClassificationFilter] = React.useState<string>("ALL");
  const [density, setDensity] = React.useState<"default" | "compact">("default");
  const [actionAsset, setActionAsset] = React.useState<KnowledgeAssetRow | null>(null);
  const [justification, setJustification] = React.useState<string>("");

  const refreshAssets = React.useCallback(() => {
    if (session.state === "AUTHENTICATED") {
      void client
        .listAssets()
        .then(setAssets)
        .catch(() => setError("Não foi possível verificar o conhecimento com segurança."));
    }
  }, [client, session.state]);

  React.useEffect(() => {
    refreshAssets();
  }, [refreshAssets]);

  if (session.state !== "AUTHENTICATED") {
    return (
      <main>
        <Alert>
          <AlertTitle>Knowledge Workbench indisponível</AlertTitle>
          <AlertDescription>{session.reason} Nenhum ativo foi carregado.</AlertDescription>
        </Alert>
      </main>
    );
  }

  const sourceOptions = [
    { value: "ALL", label: "Todas as fontes" },
    ...Array.from(new Set(assets.map((a) => a.source))).map((s) => ({ value: s, label: s })),
  ];

  const classificationOptions = [
    { value: "ALL", label: "Todas as classificações" },
    { value: "public", label: "Pública" },
    { value: "internal", label: "Interna" },
    { value: "confidential", label: "Confidencial" },
    { value: "restricted", label: "Restrita" },
  ];

  const filteredAssets = assets.filter((asset) => {
    if (sourceFilter !== "ALL" && asset.source !== sourceFilter) return false;
    if (classificationFilter !== "ALL" && asset.classification !== classificationFilter) return false;
    return true;
  });

  const handleTransition = async (action: "approve" | "reject") => {
    if (!actionAsset || !justification.trim()) return;
    try {
      if (client.transition) {
        await client.transition(actionAsset.assetId, action, justification.trim());
      }
      setActionAsset(null);
      setJustification("");
      refreshAssets();
    } catch {
      setError("Não foi possível processar a transição da versão.");
    }
  };

  return (
    <main>
      <header>
        <p>Workspace: {session.workspaceName}</p>
        <h1>Knowledge Workbench</h1>
        <p>Ativos governados, frescor e citações autorizadas.</p>
      </header>

      {error && (
        <Alert>
          <AlertTitle>Verificação indisponível</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ativos de conhecimento</CardTitle>
          <div className="domus-actions" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Select
              aria-label="Filtro de fonte"
              options={sourceOptions}
              value={sourceFilter}
              onValueChange={setSourceFilter}
              placeholder="Todas as fontes"
            />
            <Select
              aria-label="Filtro de classificação"
              options={classificationOptions}
              value={classificationFilter}
              onValueChange={setClassificationFilter}
              placeholder="Todas as classificações"
            />
            <Button onClick={() => setDensity((d) => (d === "compact" ? "default" : "compact"))}>
              Alternar densidade ({density === "compact" ? "Compacta" : "Padrão"})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table data-density={density} className={density === "compact" ? "domus-table-compact" : ""}>
            <TableHeader>
              <TableRow>
                <TableHead>Ativo</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Governança</TableHead>
                <TableHead>Frescor</TableHead>
                <TableHead>Citações</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.assetId}>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.source}</TableCell>
                  <TableCell>{asset.version}</TableCell>
                  <TableCell>
                    <Badge>{asset.classification}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{governanceLabels[asset.governance]}</Badge>
                  </TableCell>
                  <TableCell>
                    <SourceFreshnessBadge freshness={asset.freshness} />
                  </TableCell>
                  <TableCell>
                    {asset.citations > 0 ? `${asset.citations} evidência(s)` : "Sem citações"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActionAsset(asset);
                        setJustification("");
                      }}
                    >
                      Revisar versão
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {actionAsset && (
        <Dialog open={!!actionAsset} onOpenChange={(open) => !open && setActionAsset(null)}>
          <DialogContent>
            <DialogTitle>Revisar versão do ativo</DialogTitle>
            <DialogDescription>
              Confirme aprovação ou rejeição da versão {actionAsset.version} de "{actionAsset.name}". Justificativa
              obrigatória.
            </DialogDescription>
            <div style={{ margin: "1rem 0" }}>
              <label htmlFor="justification-input" style={{ display: "block", marginBottom: "0.5rem" }}>
                Justificativa
              </label>
              <textarea
                id="justification-input"
                aria-label="Justificativa"
                required
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Informe o motivo da decisão"
                rows={3}
                style={{ width: "100%", padding: "0.5rem" }}
              />
            </div>
            <div className="domus-actions" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Button disabled={!justification.trim()} onClick={() => handleTransition("approve")}>
                Aprovar
              </Button>
              <Button
                variant="destructive"
                disabled={!justification.trim()}
                onClick={() => handleTransition("reject")}
              >
                Rejeitar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
