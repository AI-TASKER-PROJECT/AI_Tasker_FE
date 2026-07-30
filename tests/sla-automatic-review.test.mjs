import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settingsSource = readFileSync(
  new URL("../src/pages/AdminPages/SettingsPage/SettingsPage.tsx", import.meta.url),
  "utf8",
);
const workspaceSource = readFileSync(
  new URL("../src/pages/ContractPages/WorkspacePage/WorkspacePage.tsx", import.meta.url),
  "utf8",
);
const contractServiceSource = readFileSync(
  new URL("../src/services/contractService.ts", import.meta.url),
  "utf8",
);

test("Admin SLA configuration supports minute, hour and day without a disable action", () => {
  assert.match(settingsSource, /milestone_review_sla_duration/);
  assert.match(settingsSource, /option value="MINUTE"/);
  assert.match(settingsSource, /option value="HOUR"/);
  assert.match(settingsSource, /option value="DAY"/);
  assert.match(settingsSource, /setting\.settingKey !== REVIEW_SLA_KEY/);
});

test("workspace displays backend deadline countdown and does not trigger settlement", () => {
  assert.match(workspaceSource, /reviewSlaCountdownLabel/);
  assert.match(workspaceSource, /milestone\.reviewDueAt/);
  assert.doesNotMatch(workspaceSource, /autoApproveReviewSla/);
  assert.doesNotMatch(contractServiceSource, /sla-auto-approve/);
});
