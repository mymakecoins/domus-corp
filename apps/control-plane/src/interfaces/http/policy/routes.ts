import type {FastifyInstance, FastifyRequest} from "fastify";
import type {PolicySecurityContext} from "../../../application/policy/resolve-effective-policy.js";
import type {EffectivePolicy} from "../../../domain/policy/policy-engine.js";

export type PolicyServices = Readonly<{
  authorizePolicyRequest(request: FastifyRequest): Promise<PolicySecurityContext>;
  resolveEffectivePolicy(context: PolicySecurityContext): Promise<EffectivePolicy>;
}>;

function response(policy: EffectivePolicy) {
  return {
    schema_version:"1.0.0",request_id:policy.requestId,tenant_id:policy.tenantId,workspace_id:policy.workspaceId,
    user_id:policy.userId,device_id:policy.deviceId,policy_version:policy.policyVersion,
    classification:policy.allowedClassifications.at(-1)??"public",
    provenance:{source_id:policy.workspaceId,source_version:policy.policyVersion,observed_at:policy.evaluatedAt,producer:"policy-ts"},
    allowed_sources:policy.allowedSources,allowed_assets:policy.allowedAssets,allowed_models:policy.allowedModels,
    allowed_tools:policy.allowedTools,allowed_actions:policy.allowedActions,allowed_classifications:policy.allowedClassifications,
    retention_rules:{max_days:policy.retentionRules.maxDays},freshness_rules:{max_age_seconds:policy.freshnessRules.maxAgeSeconds},
    insight_rules:policy.insightRules,budget_scope:{scope_id:policy.budgetScope.scopeId,currency:policy.budgetScope.currency,limit_minor:policy.budgetScope.limitMinor,remaining_minor:policy.budgetScope.remainingMinor},
    decision:policy.decision,deny_reasons:policy.denyReasons,
    policy_provenance:policy.provenance.map((item)=>({scope:item.scope,policy_id:item.policyId,version:item.version})),
    evaluated_at:policy.evaluatedAt,expires_at:policy.expiresAt,
  };
}

export function registerPolicyRoutes(app: FastifyInstance, services: PolicyServices): void {
  app.post("/v1/policy/effective",async(request,reply)=>{
    try {
      const context=await services.authorizePolicyRequest(request);
      return reply.send(response(await services.resolveEffectivePolicy(context)));
    } catch(error) {
      const unavailable=String(error).includes("DEPENDENCY_UNAVAILABLE");
      return reply.code(unavailable?503:403).send({code:unavailable?"POLICY_DEPENDENCY_UNAVAILABLE":"POLICY_DENIED"});
    }
  });
}
