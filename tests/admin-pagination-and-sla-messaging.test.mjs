import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const accountsSource = source("../src/pages/AdminPages/AccountsPage/AccountsPage.tsx");
const auditSource = source("../src/pages/AdminPages/AuditLogsPage/AuditLogsPage.tsx");
const masterDataSource = source("../src/pages/AdminPages/MasterDataPage/MasterDataPage.tsx");
const withdrawalSource = source("../src/pages/AdminPages/WithdrawalPage/WithdrawalPage.tsx");
const staffSource = source("../src/pages/AdminPages/StaffPage/StaffPage.tsx");
const workspaceSource = source("../src/pages/ContractPages/WorkspacePage/WorkspacePage.tsx");

test("requested Admin lists expose pagination over their filtered data", () => {
  assert.match(accountsSource, /paginatedAccounts\.map/);
  assert.match(auditSource, /paginatedLogs\.map/);
  assert.match(masterDataSource, /paginatedItems\.map/);
  assert.match(withdrawalSource, /paginatedWithdrawals\.map/);

  for (const pageSource of [accountsSource, auditSource, masterDataSource, withdrawalSource]) {
    assert.match(pageSource, /<AdminPagination/);
    assert.match(pageSource, /setCurrentPage\(1\)/);
  }
});

test("automatic SLA completion is described as approved and disbursed", () => {
  assert.match(workspaceSource, /Hệ thống đã tự động duyệt và giải ngân cột mốc/);
  assert.match(workspaceSource, /Đã tự động duyệt và giải ngân/);
  assert.match(workspaceSource, /REVIEW_SLA_AUTO_APPROVAL/);
});

test("Staff specialization popup shows both employee name and email", () => {
  assert.match(staffSource, /label="Họ tên nhân viên"/);
  assert.match(staffSource, /editing\?\.fullName/);
  assert.match(staffSource, /label="Email"/);
  assert.match(staffSource, /editing\?\.email/);
});
