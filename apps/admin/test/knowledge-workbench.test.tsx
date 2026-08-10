import "@testing-library/jest-dom/vitest"; import { cleanup, render, screen, waitFor } from "@testing-library/react"; import { afterEach, describe, expect, it } from "vitest"; import { KnowledgeWorkbench } from "../src/knowledge-workbench.js";
afterEach(cleanup);
describe("KnowledgeWorkbench", () => {
  it("fails closed without session", () => { const client = { listAssets: async () => [] }; render(<KnowledgeWorkbench session={{ state: "UNAVAILABLE", reason: "Sessão ausente." }} client={client} />); expect(screen.getByRole("alert")).toHaveTextContent("Nenhum ativo foi carregado"); });
  it("renders real governance, freshness and citation states", async () => { render(<KnowledgeWorkbench session={{ state: "AUTHENTICATED", workspaceName: "Financeiro" }} client={{ listAssets: async () => [{ assetId: "a1", name: "Política", source: "Manual", version: 2, classification: "confidential", freshness: "FRESH", governance: "EFFECTIVE", citations: 3 }] }} />); await waitFor(() => expect(screen.getByText("Política")).toBeInTheDocument()); expect(screen.getByText("Vigente")).toBeInTheDocument(); expect(screen.getByText("3 evidência(s)")).toBeInTheDocument(); });
});
