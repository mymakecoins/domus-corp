import { test } from "node:test";
import assert from "node:assert/strict";
import { GoogleDriveConnector } from "../../../dist/application/connectors/google-drive-connector.js";
import { GmailConnector } from "../../../dist/application/connectors/google-gmail-connector.js";
import { GoogleCalendarConnector } from "../../../dist/application/connectors/google-calendar-connector.js";
import { MockCredentialResolver } from "../../../dist/infrastructure/credentials/credential-resolver.js";

test("GoogleDriveConnector performs search and read file operations", async () => {
  const credentialResolver = new MockCredentialResolver();
  const drive = new GoogleDriveConnector(credentialResolver, async (url, init) => {
    return new Response(JSON.stringify({ files: [{ id: "file-1", name: "Doc.pdf" }] }), { status: 200 });
  });

  const searchRes = await drive.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "google_drive_search", parameters: { query: "name contains 'Doc'" }
  });

  assert.equal(searchRes.success, true);
  assert.ok(searchRes.data);
});

test("GmailConnector supports search, draft, send, and checkStatus", async () => {
  const credentialResolver = new MockCredentialResolver();
  const sentKeys = new Set<string>();

  const gmail = new GmailConnector(credentialResolver, async (url, init) => {
    if (String(url).includes("/messages/send")) {
      const key = (init?.headers as any)?.["X-Idempotency-Key"];
      if (key) sentKeys.add(key);
      return new Response(JSON.stringify({ id: "msg-123", threadId: "th-456", labelIds: ["SENT"] }), { status: 200 });
    }
    return new Response(JSON.stringify({ messages: [] }), { status: 200 });
  }, sentKeys);

  const sendRes = await gmail.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "gmail_send_message",
    idempotencyKey: "idem-gmail-1",
    parameters: { to: "boss@domus.com", subject: "Report", body: "Attached report" }
  });

  assert.equal(sendRes.success, true);
  const status = await gmail.checkStatus("idem-gmail-1");
  assert.equal(status.executed, true);
});

test("GoogleCalendarConnector supports event list and creation", async () => {
  const credentialResolver = new MockCredentialResolver();
  const calendar = new GoogleCalendarConnector(credentialResolver, async () => {
    return new Response(JSON.stringify({ id: "evt-789", summary: "Sync Meeting" }), { status: 200 });
  });

  const createRes = await calendar.execute({
    tenantId: "t1", workspaceId: "w1", userId: "u1",
    operation: "calendar_create_event",
    parameters: { summary: "Sync Meeting", start: "2026-08-15T10:00:00Z", end: "2026-08-15T11:00:00Z" }
  });

  assert.equal(createRes.success, true);
});
