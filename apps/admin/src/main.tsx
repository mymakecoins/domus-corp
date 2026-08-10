import "@domus/ui/tokens.css";import React from "react";import {createRoot} from "react-dom/client";import {SourceAdmin} from "./source-admin.js";import {KnowledgeWorkbench} from "./knowledge-workbench.js";
const unavailable={state:"UNAVAILABLE",reason:"A sessão OIDC/PKCE ainda não foi estabelecida."} as const;
const client={async list(){throw new Error("SESSION_UNAVAILABLE");},async create(){throw new Error("SESSION_UNAVAILABLE");},async transition(){throw new Error("SESSION_UNAVAILABLE");}};
createRoot(document.getElementById("root")!).render(<React.StrictMode><SourceAdmin session={unavailable} client={client}/><KnowledgeWorkbench session={unavailable} client={{listAssets:async()=>{throw new Error("SESSION_UNAVAILABLE");}}}/></React.StrictMode>);
