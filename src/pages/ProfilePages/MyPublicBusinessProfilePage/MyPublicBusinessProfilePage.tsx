import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { profileApi } from "../../../lib/api";
import { Notice } from "../../../components/ui";

export function MyPublicBusinessProfilePage() {
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    profileApi
      .getMyBusiness()
      .then((profile) => setBusinessId(profile.businessId))
      .catch(() => setError("Không thể tải trang cá nhân doanh nghiệp."));
  }, []);
  if (error) return <Notice tone="danger" title={error} />;
  if (!businessId) return <Notice title="Đang mở trang cá nhân..." />;
  return <Navigate to={`/business-profile/${businessId}`} replace />;
}
