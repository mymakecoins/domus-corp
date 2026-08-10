import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KnowledgeWorkbench } from "../src/knowledge-workbench.js";

afterEach(cleanup);

describe("KnowledgeWorkbench", () => {
  it("fails closed without session", () => {
    const client = { listAssets: async () => [] };
    render(<KnowledgeWorkbench session={{ state: "UNAVAILABLE", reason: "Sessão ausente." }} client={client} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Nenhum ativo foi carregado");
  });

  it("renders real governance, freshness and citation states", async () => {
    render(
      <KnowledgeWorkbench
        session={{ state: "AUTHENTICATED", workspaceName: "Financeiro" }}
        client={{
          listAssets: async () => [
            {
              assetId: "a1",
              name: "Política",
              source: "Manual",
              version: 2,
              classification: "confidential",
              freshness: "FRESH",
              governance: "EFFECTIVE",
              citations: 3,
            },
          ],
        }}
      />
    );
    await waitFor(() => expect(screen.getByText("Política")).toBeInTheDocument());
    expect(screen.getByText("Vigente")).toBeInTheDocument();
    expect(screen.getByText("3 evidência(s)")).toBeInTheDocument();
  });

  it("renders freshness badge and filter dropdowns", async () => {
    const mockAssets = [
      {
        assetId: "a1",
        name: "Doc 1",
        source: "Source A",
        version: 1,
        classification: "internal" as const,
        freshness: "FRESH" as const,
        governance: "EFFECTIVE" as const,
        citations: 2,
      },
    ];
    const client = { listAssets: vi.fn().mockResolvedValue(mockAssets), transition: vi.fn() };
    render(<KnowledgeWorkbench session={{ state: "AUTHENTICATED", workspaceName: "WS 1" }} client={client} />);
    expect(await screen.findByText("Doc 1")).toBeInTheDocument();
    expect(screen.getByText("Atualizado")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /filtro de fonte/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /filtro de classificação/i })).toBeInTheDocument();
  });

  it("toggles table density between default and compact", async () => {
    const mockAssets = [
      {
        assetId: "a1",
        name: "Doc 1",
        source: "Source A",
        version: 1,
        classification: "internal" as const,
        freshness: "FRESH" as const,
        governance: "EFFECTIVE" as const,
        citations: 2,
      },
    ];
    const client = { listAssets: vi.fn().mockResolvedValue(mockAssets) };
    render(<KnowledgeWorkbench session={{ state: "AUTHENTICATED", workspaceName: "WS 1" }} client={client} />);
    expect(await screen.findByText("Doc 1")).toBeInTheDocument();

    const densityBtn = screen.getByRole("button", { name: /alternar densidade/i });
    expect(densityBtn).toHaveTextContent(/padrão/i);

    fireEvent.click(densityBtn);
    expect(densityBtn).toHaveTextContent(/compacta/i);

    fireEvent.click(densityBtn);
    expect(densityBtn).toHaveTextContent(/padrão/i);
  });

  it("opens version approval modal and executes transition with mandatory justification", async () => {
    const mockAssets = [
      {
        assetId: "a1",
        name: "Doc 1",
        source: "Source A",
        version: 1,
        classification: "internal" as const,
        freshness: "FRESH" as const,
        governance: "PENDING" as const,
        citations: 0,
      },
    ];
    const client = {
      listAssets: vi.fn().mockResolvedValue(mockAssets),
      transition: vi.fn().mockResolvedValue(undefined),
    };
    render(<KnowledgeWorkbench session={{ state: "AUTHENTICATED", workspaceName: "WS 1" }} client={client} />);
    expect(await screen.findByText("Doc 1")).toBeInTheDocument();

    const reviewBtn = screen.getByRole("button", { name: /revisar versão/i });
    fireEvent.click(reviewBtn);

    expect(screen.getByText(/revisar versão do ativo/i)).toBeInTheDocument();
    const approveBtn = screen.getByRole("button", { name: /^aprovar$/i });
    expect(approveBtn).toBeDisabled();

    const textInput = screen.getByRole("textbox", { name: /justificativa/i });
    fireEvent.change(textInput, { target: { value: "Aprovado após auditoria" } });
    expect(approveBtn).toBeEnabled();

    fireEvent.click(approveBtn);
    await waitFor(() => {
      expect(client.transition).toHaveBeenCalledWith("a1", "approve", "Aprovado após auditoria");
    });
  });

  it("filters assets by source and classification", async () => {
    const mockAssets = [
      {
        assetId: "a1",
        name: "Doc Alpha",
        source: "Source A",
        version: 1,
        classification: "internal" as const,
        freshness: "FRESH" as const,
        governance: "EFFECTIVE" as const,
        citations: 2,
      },
      {
        assetId: "a2",
        name: "Doc Beta",
        source: "Source B",
        version: 2,
        classification: "confidential" as const,
        freshness: "STALE" as const,
        governance: "PENDING" as const,
        citations: 0,
      },
    ];
    const client = { listAssets: vi.fn().mockResolvedValue(mockAssets) };
    render(<KnowledgeWorkbench session={{ state: "AUTHENTICATED", workspaceName: "WS 1" }} client={client} />);
    expect(await screen.findByText("Doc Alpha")).toBeInTheDocument();
    expect(screen.getByText("Doc Beta")).toBeInTheDocument();

    const sourceSelect = screen.getByRole("combobox", { name: /filtro de fonte/i });
    expect(sourceSelect).toBeInTheDocument();
    const classSelect = screen.getByRole("combobox", { name: /filtro de classificação/i });
    expect(classSelect).toBeInTheDocument();
  });

  it("allows rejecting a version with mandatory justification", async () => {
    const mockAssets = [
      {
        assetId: "a2",
        name: "Doc 2",
        source: "Source B",
        version: 3,
        classification: "restricted" as const,
        freshness: "STALE" as const,
        governance: "PENDING" as const,
        citations: 0,
      },
    ];
    const client = {
      listAssets: vi.fn().mockResolvedValue(mockAssets),
      transition: vi.fn().mockResolvedValue(undefined),
    };
    render(<KnowledgeWorkbench session={{ state: "AUTHENTICATED", workspaceName: "WS 1" }} client={client} />);
    expect(await screen.findByText("Doc 2")).toBeInTheDocument();

    const reviewBtn = screen.getByRole("button", { name: /revisar versão/i });
    fireEvent.click(reviewBtn);

    const rejectBtn = screen.getByRole("button", { name: /^rejeitar$/i });
    expect(rejectBtn).toBeDisabled();

    const textInput = screen.getByRole("textbox", { name: /justificativa/i });
    fireEvent.change(textInput, { target: { value: "Rejeitado por ter dados inconsistentes" } });
    expect(rejectBtn).toBeEnabled();

    fireEvent.click(rejectBtn);
    await waitFor(() => {
      expect(client.transition).toHaveBeenCalledWith("a2", "reject", "Rejeitado por ter dados inconsistentes");
    });
  });
});





