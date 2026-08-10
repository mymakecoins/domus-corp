import "@domus/ui/tokens.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { SourceAdmin } from "./source-admin.js";
import { KnowledgeWorkbench } from "./knowledge-workbench.js";
import { IntelligenceWorkbench } from "./intelligence-workbench.js";
import { createIntelligenceClient } from "./intelligence-client.js";

const unavailable = { state: "UNAVAILABLE", reason: "A sessão OIDC/PKCE ainda não foi estabelecida." } as const;
const client = {
  async list() { throw new Error("SESSION_UNAVAILABLE"); },
  async create() { throw new Error("SESSION_UNAVAILABLE"); },
  async transition() { throw new Error("SESSION_UNAVAILABLE"); },
};

const intelligenceClient = createIntelligenceClient(unavailable);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <IntelligenceWorkbench session={unavailable} client={intelligenceClient} />
    <KnowledgeWorkbench session={unavailable} client={{ listAssets: async () => { throw new Error("SESSION_UNAVAILABLE"); } }} />
    <SourceAdmin session={unavailable} client={client} />
  </React.StrictMode>
);
