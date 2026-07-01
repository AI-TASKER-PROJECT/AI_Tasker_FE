import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { profileApi } from "../../../lib/api";
import { Notice } from "../../../components/ui";

export function MyPublicExpertProfilePage() {
  const [expertId, setExpertId] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    profileApi
      .getMyExpert()
      .then((profile) => setExpertId(profile.expertId))
      .catch(() => setError("Không thể tải trang cá nhân chuyên gia."));
  }, []);
  if (error) return <Notice tone="danger" title={error} />;
  if (!expertId) return <Notice title="Đang mở trang cá nhân..." />;
  return <Navigate to={`/expert-profile/${expertId}`} replace />;
}
