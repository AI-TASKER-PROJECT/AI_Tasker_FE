import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  formatJobSowText,
  getEditableJobSow,
  getJobSowSummary,
  resolveJobSow,
} from "../src/lib/jobSow.ts";

const legacySeedSow = JSON.stringify({
  sow: {
    title: "SoW - Hệ thống gợi ý",
    overview: "Xây dựng hệ thống xếp hạng sản phẩm.",
    objectives: ["Tăng mức liên quan", "Giảm sản phẩm hết hàng"],
    scopeOfWork: ["Phân tích hành vi", "Phát triển API"],
    deliverables: ["Mô hình gợi ý", "Dashboard"],
    assumptions: ["Dữ liệu đã ẩn danh"],
    outOfScope: ["Không thay đổi POS"],
  },
  milestones: [{ name: "Baseline" }],
});

test("legacy structuredSow JSON is converted into readable SoW sections", () => {
  const display = resolveJobSow({
    structuredSow: legacySeedSow,
    rawRequirements: "Fallback",
  });

  assert.equal(display.title, "SoW - Hệ thống gợi ý");
  assert.equal(display.overview, "Xây dựng hệ thống xếp hạng sản phẩm.");
  assert.deepEqual(
    display.sections.find((section) => section.key === "objectives")?.items,
    ["Tăng mức liên quan", "Giảm sản phẩm hết hàng"],
  );
  assert.doesNotMatch(getJobSowSummary({ structuredSow: legacySeedSow }), /[{}\[\]"]/);
});

test("normalized job.sow is preferred and supports JSON-array strings from the API", () => {
  const job = {
    sow: {
      title: "SoW chuẩn hóa",
      overview: "Nội dung chuẩn hóa",
      objectives: '["Mục tiêu A","Mục tiêu B"]',
      scopeOfWork: "- Phạm vi A\n- Phạm vi B",
      deliverable: '["Bản bàn giao"]',
    },
    structuredSow: legacySeedSow,
    rawRequirements: "Fallback",
  };
  const display = resolveJobSow(job);

  assert.equal(display.title, "SoW chuẩn hóa");
  assert.deepEqual(display.sections[0]?.items, ["Mục tiêu A", "Mục tiêu B"]);
  assert.deepEqual(display.sections[1]?.items, ["Phạm vi A", "Phạm vi B"]);
  assert.deepEqual(display.sections[2]?.items, ["Bản bàn giao"]);
  assert.deepEqual(getEditableJobSow(job)?.objectives, ["Mục tiêu A", "Mục tiêu B"]);
  assert.match(formatJobSowText(job), /Mục tiêu:\n- Mục tiêu A\n- Mục tiêu B/);
});

test("plain text remains readable and unknown JSON falls back to requirements", () => {
  assert.equal(
    resolveJobSow({ structuredSow: "Tổng quan:\nNội dung dự án" }).plainText,
    "Tổng quan:\nNội dung dự án",
  );
  assert.equal(
    resolveJobSow({
      structuredSow: JSON.stringify({ unexpected: { nested: true } }),
      rawRequirements: "Yêu cầu gốc",
    }).plainText,
    "Yêu cầu gốc",
  );
});

test("Job detail surfaces use the shared safe renderer", () => {
  const businessDetail = readFileSync(
    new URL("../src/pages/MarketplacePages/MyJobsPage/MyJobDetailPage.tsx", import.meta.url),
    "utf8",
  );
  const publicDetail = readFileSync(
    new URL("../src/pages/PublicPages/JobDetailPage/JobDetailPage.tsx", import.meta.url),
    "utf8",
  );

  assert.match(businessDetail, /<JobSowContent job=\{job\}/);
  assert.match(publicDetail, /<JobSowContent/);
  assert.doesNotMatch(businessDetail, /dangerouslySetInnerHTML/);
});
