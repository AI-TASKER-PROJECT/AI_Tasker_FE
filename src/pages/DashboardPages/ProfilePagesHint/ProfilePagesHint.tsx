/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Gavel,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { contractApi, disputeApi, marketplaceApi } from "../../../services";
import { roleLabel, useSession } from "../../../context/sessionContext";
import { formatCompactCurrency } from "../../../lib/utils";
import type { Contract, Dispute, Job, NotificationItem } from "../../../types";
import {
  Badge,
  Card,
  LinkButton,
  ListLink,
  MetricCard,
  Notice,
  PageHeader,
  SectionHeading,
  StatusBadge,
} from "../../../components/ui";

import * as DashboardPagesHelpers from '../DashboardPages.helpers';

export function ProfilePagesHint() {
  return (
    <Notice tone="info" title="Luồng xác minh">
      Hồ sơ mặc dịnh ở trạng thái Pending. Admin hoặc Staff chuyển sang Approved
      dể mở khóa giao dịch.
    </Notice>
  );
}
