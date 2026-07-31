import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const routesSource = source("../src/routes/index.tsx");
const contractServiceSource = source("../src/services/contractService.ts");
const workspaceSource = source("../src/pages/ContractPages/WorkspacePage/WorkspacePage.tsx");
const summarySource = source("../src/pages/ContractPages/ProjectSummaryPage/ProjectSummaryPage.tsx");
const notificationRouteSource = source("../src/lib/notifications.ts");
const notificationsPageSource = source("../src/pages/DashboardPages/NotificationsPage/NotificationsPage.tsx");
const membershipSource = source("../src/pages/PaymentPages/MembershipPage/MembershipPage.tsx");
const proposalSource = source("../src/pages/MarketplacePages/SubmitProposalPage/SubmitProposalPage.tsx");

test("completed projects expose a dedicated summary route and API", () => {
  assert.match(routesSource, /contracts\/:contractId\/summary/);
  assert.match(routesSource, /ProjectSummaryPage/);
  assert.match(contractServiceSource, /\/api\/v1\/contracts\/\$\{contractId\}\/summary/);
  assert.match(summarySource, /Kết quả bàn giao theo cột mốc/);
  assert.match(summarySource, /userGuideFileUrl/);
});

test("final milestone delivery requires a PDF or DOCX usage guide", () => {
  assert.match(contractServiceSource, /user-guide-file/);
  assert.match(workspaceSource, /Tệp hướng dẫn sử dụng sản phẩm \(bắt buộc\)/);
  assert.match(workspaceSource, /\.pdf,\.docx/);
  assert.match(workspaceSource, /userGuideFileUrl/);
});

test("summary notifications open the summary and show a Vietnamese type label", () => {
  assert.match(notificationRouteSource, /PROJECT_SUMMARY_READY/);
  assert.match(notificationRouteSource, /\/summary/);
  assert.match(notificationsPageSource, /item\.typeLabel/);
  assert.doesNotMatch(notificationsPageSource, /item\.type\s*\}/);
});

test("membership and proposal screens describe purchasable limits as quota", () => {
  assert.match(membershipSource, /quota đăng dự án/);
  assert.match(membershipSource, /quota nộp bản đề xuất/);
  assert.doesNotMatch(proposalSource, /mua thêm credit/i);
});
