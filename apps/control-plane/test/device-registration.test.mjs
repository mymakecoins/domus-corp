import assert from "node:assert/strict";
import { test } from "node:test";
import { registerDeviceAccess } from "../dist/application/identity/register-device.js";

const command = {tenantId:"22222222-2222-4222-8222-222222222222",userId:"55555555-5555-4555-8555-555555555555",deviceId:"20202020-2020-4020-8020-202020202020",publicKeyThumbprint:`sha256:${"b".repeat(64)}`,proof:"synthetic-proof",requestId:"11111111-1111-4111-8111-111111111111",eventId:"30303030-3030-4030-8030-303030303030"};

test("activates a device only after proof of possession and publishes cache", async () => {
  const order=[];
  const device=await registerDeviceAccess({proofVerifier:{verify:async()=>order.push("proof")},repository:{registerActive:async()=>{order.push("postgres");return {version:2};}},cache:{publish:async()=>order.push("redis")},clock:{now:()=>new Date("2026-08-08T12:00:00Z")}},command);
  assert.deepEqual(order,["proof","postgres","redis"]);
  assert.equal(device.status,"ACTIVE");
});

test("does not persist when proof of possession fails", async () => {
  let persisted=false;
  await assert.rejects(registerDeviceAccess({proofVerifier:{verify:async()=>{throw new Error("DEVICE_PROOF_INVALID");}},repository:{registerActive:async()=>{persisted=true;return {version:2};}},cache:{publish:async()=>{}},clock:{now:()=>new Date()}},command),/DEVICE_PROOF_INVALID/);
  assert.equal(persisted,false);
});
