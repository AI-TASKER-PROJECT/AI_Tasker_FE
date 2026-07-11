import { RefreshCw, Star } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { contractApi, getApiErrorMessage } from "../../../services";
import { useSession } from "../../../context/sessionContext";
import type { Contract, Review } from "../../../types";
import { formatDate } from "../../../lib/utils";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  Notice,
  PageHeader,
  SectionHeading,
  Textarea,
} from "../../../components/ui";

function isClosedContract(contract: Contract) {
  return (contract.status || "").trim().toUpperCase() === "CLOSED";
}

function contractLabel(contract: Contract) {
  return contract.contractTitle || contract.title || `Contract #${contract.contractId}`;
}

function partnerRoleLabel(role?: string) {
  return role === "BUSINESS" ? "Chuyên gia" : "Doanh nghiệp";
}

function RatingStars({
  value,
  onChange,
  interactive = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  interactive?: boolean;
}) {
  return (
    <div className="flex items-center gap-1" aria-label={`Đánh giá ${value} trên 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          className={interactive ? "rounded-lg p-1 transition hover:bg-amber-50" : "p-1"}
          aria-label={`${star} sao`}
        >
          <Star
            className={`h-6 w-6 ${star <= value ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewsPage() {
  const session = useSession();
  const [searchParams] = useSearchParams();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsByContract, setReviewsByContract] = useState<
    Record<number, Review[]>
  >({});
  const [selectedContractId, setSelectedContractId] = useState("");
  const [contractQuery, setContractQuery] = useState("");
  const [contractListMode, setContractListMode] = useState<"pending" | "history">("pending");
  const [visibleContractCount, setVisibleContractCount] = useState(6);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "danger" | "info";
    title: string;
    message?: string;
  } | null>(null);

  const closedContracts = useMemo(
    () => contracts.filter(isClosedContract),
    [contracts],
  );
  const contractsToReview = useMemo(
    () =>
      closedContracts.filter(
        (contract) =>
          !(reviewsByContract[contract.contractId] || []).some(
            (review) => review.reviewerId === session?.accountId,
          ),
      ),
    [closedContracts, reviewsByContract, session?.accountId],
  );
  const reviewedContracts = useMemo(
    () => closedContracts.filter((contract) => !contractsToReview.includes(contract)),
    [closedContracts, contractsToReview],
  );
  const normalizedQuery = contractQuery.trim().toLowerCase();
  const filteredPendingContracts = useMemo(
    () => contractsToReview.filter((contract) => contractLabel(contract).toLowerCase().includes(normalizedQuery)),
    [contractsToReview, normalizedQuery],
  );
  const filteredReviewedContracts = useMemo(
    () => reviewedContracts.filter((contract) => contractLabel(contract).toLowerCase().includes(normalizedQuery)),
    [reviewedContracts, normalizedQuery],
  );

  const activeContractId = Number(selectedContractId);
  const selectedContract = contracts.find(
    (contract) => contract.contractId === activeContractId,
  );
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
      reviews.length
    : 0;
  const hasReviewed = reviews.some(
    (review) => review.reviewerId === session?.accountId,
  );
  const partnerName = selectedContract
    ? session?.role === "BUSINESS"
      ? selectedContract.expertName || "Chuyên gia"
      : selectedContract.businessName || "Doanh nghiệp"
    : "đối tác";
  const partnerType = partnerRoleLabel(session?.role);

  const loadContracts = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const data = await contractApi.listContracts();
      setContracts(data);
      const closed = data.filter(isClosedContract);
      const reviewEntries = await Promise.all(
        closed.map(async (contract) => {
          try {
            return [
              contract.contractId,
              await contractApi.listReviews(contract.contractId),
            ] as const;
          } catch {
            return [contract.contractId, []] as const;
          }
        }),
      );
      setReviewsByContract(Object.fromEntries(reviewEntries));
      const requestedId = Number(searchParams.get("contractId"));
      const requestedContract = closed.find(
        (contract) => contract.contractId === requestedId,
      );
      if (requestedContract) {
        setSelectedContractId(String(requestedContract.contractId));
      }
    } catch (error) {
      setNotice({
        tone: "danger",
        title: "Khong tai duoc danh sach hop dong.",
        message: getApiErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (contractId: number) => {
    if (!Number.isFinite(contractId) || contractId <= 0) {
      setReviews([]);
      return;
    }
    try {
      const items = await contractApi.listReviews(contractId);
      setReviews(items);
      setReviewsByContract((current) => ({ ...current, [contractId]: items }));
    } catch {
      setReviews([]);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadContracts();
    }, 0);
    return () => window.clearTimeout(timer);
  // The loader is intentionally invoked once per requested contract query.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReviews(activeContractId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeContractId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const contractId = Number(selectedContractId);
    const numericRating = Number(rating);
    if (
      !Number.isFinite(contractId) ||
      contractId <= 0 ||
      !Number.isFinite(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      setNotice({
        tone: "danger",
        title: "Du lieu danh gia chua hop le.",
        message: "Vui lòng chọn hợp đồng và mức đánh giá từ 1 đến 5 sao.",
      });
      return;
    }
    if (hasReviewed) {
      setNotice({
        tone: "info",
        title: "Bạn đã đánh giá hợp đồng này.",
        message: "Mỗi bên chỉ được gửi một đánh giá cho mỗi hợp đồng.",
      });
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const review = await contractApi.createReview(contractId, {
        rating: numericRating,
        comment,
      });
      setReviews((items) => [review, ...items]);
      setReviewsByContract((items) => ({
        ...items,
        [contractId]: [review, ...(items[contractId] || [])],
      }));
      setComment("");
      setNotice({
        tone: "success",
        title: "Đã gửi đánh giá.",
        message: `Bạn đã đánh giá ${partnerType} ${partnerName}. Đánh giá đã được ghi nhận cho hợp đồng này.`,
      });
    } catch (error) {
      setNotice({
        tone: "danger",
        title: "Gửi đánh giá thất bại.",
        message: getApiErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          eyebrow="ĐÁNH GIÁ ĐỐI TÁC"
          title="Đánh giá sau hợp đồng"
          description="Chia sẻ trải nghiệm hợp tác sau khi hợp đồng đã được tất toán."
          actions={
            <Button variant="secondary" onClick={loadContracts} loading={loading}>
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </Button>
          }
        />
      </div>

      {notice && (
        <Notice tone={notice.tone} title={notice.title}>
          {notice.message}
        </Notice>
      )}

      {closedContracts.length > 0 && (
        <Card className="p-6">
          <SectionHeading
            title="Bước 1 · Chọn hợp đồng"
            description="Chọn hợp đồng đã tất toán để xem đối tác và mở biểu mẫu đánh giá."
          />
          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <input
              value={contractQuery}
              onChange={(event) => {
                setContractQuery(event.target.value);
                setVisibleContractCount(6);
              }}
              placeholder="Tìm theo tên hợp đồng..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 lg:max-w-sm"
            />
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setContractListMode("pending");
                  setVisibleContractCount(6);
                }}
                className={`rounded-lg px-3 py-2 text-xs font-extrabold transition ${contractListMode === "pending" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"}`}
              >
                Chưa đánh giá ({contractsToReview.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setContractListMode("history");
                  setVisibleContractCount(6);
                }}
                className={`rounded-lg px-3 py-2 text-xs font-extrabold transition ${contractListMode === "history" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"}`}
              >
                Đã đánh giá ({reviewedContracts.length})
              </button>
            </div>
          </div>
          {contractListMode === "pending" && filteredPendingContracts.length > 0 && (
            <>
              <p className="mt-5 text-sm font-extrabold text-ink">
                Hợp đồng cần đánh giá ({contractsToReview.length})
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredPendingContracts.slice(0, visibleContractCount).map((contract) => (
              <button
                key={contract.contractId}
                type="button"
                onClick={() => setSelectedContractId(String(contract.contractId))}
                className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 ${
                  activeContractId === contract.contractId
                    ? "border-brand-300 bg-brand-50 shadow-sm"
                    : "border-slate-100 bg-white"
                }`}
              >
                <span className="inline-flex rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-brand-700">
                  Chưa đánh giá
                </span>
                <p className="font-extrabold text-ink">{contractLabel(contract)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {session?.role === "BUSINESS"
                    ? `Đánh giá ${contract.expertName || "Chuyên gia"}`
                    : `Đánh giá ${contract.businessName || "Doanh nghiệp"}`}
                </p>
                <p className="mt-3 text-xs font-bold text-brand-600">
                  Chọn để đánh giá →
                </p>
              </button>
            ))}
              </div>
              {filteredPendingContracts.length > visibleContractCount && (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4 w-full"
                  onClick={() => setVisibleContractCount((count) => count + 6)}
                >
                  Xem thêm hợp đồng ({filteredPendingContracts.length - visibleContractCount} còn lại)
                </Button>
              )}
            </>
          )}
          {contractListMode === "history" && filteredReviewedContracts.length > 0 && (
            <>
              <p className="mt-6 text-sm font-extrabold text-ink">
                Hợp đồng đã đánh giá ({reviewedContracts.length})
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {filteredReviewedContracts.slice(0, visibleContractCount).map((contract) => (
                  <button
                    key={contract.contractId}
                    type="button"
                    onClick={() => setSelectedContractId(String(contract.contractId))}
                    className={`rounded-xl border px-3 py-2 text-left text-sm font-bold transition hover:border-slate-300 ${
                      activeContractId === contract.contractId
                        ? "border-slate-300 bg-slate-100 text-ink"
                        : "border-slate-100 bg-white text-slate-600"
                    }`}
                  >
                    {contractLabel(contract)}
                    <span className="ml-2 text-xs font-semibold text-emerald-600">Đã đánh giá</span>
                  </button>
                ))}
              </div>
              {filteredReviewedContracts.length > visibleContractCount && (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-4 w-full"
                  onClick={() => setVisibleContractCount((count) => count + 6)}
                >
                  Xem thêm lịch sử ({filteredReviewedContracts.length - visibleContractCount} còn lại)
                </Button>
              )}
            </>
          )}
          {((contractListMode === "pending" && filteredPendingContracts.length === 0) ||
            (contractListMode === "history" && filteredReviewedContracts.length === 0)) && (
            <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm font-semibold text-slate-500">
              Không tìm thấy hợp đồng phù hợp.
            </p>
          )}
        </Card>
      )}

      {closedContracts.length === 0 && !loading && (
        <Notice tone="info" title="Chưa có hợp đồng đủ điều kiện đánh giá.">
          Hợp đồng sẽ xuất hiện sau khi được tất toán và chuyển sang trạng thái
          CLOSED.
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="p-6">
          <SectionHeading
            title="Bước 2 · Gửi đánh giá"
            description={selectedContract ? `Đánh giá ${partnerType}: ${partnerName}` : "Chọn một hợp đồng đã tất toán để bắt đầu."}
          />
          {selectedContract ? (
            <>
              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-ink">
                    {contractLabel(selectedContract)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Đánh giá {partnerName}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedContractId("")}
                >
                  Chọn hợp đồng khác
                </Button>
              </div>
              <form onSubmit={submit} className="mt-4 grid gap-4">
            <Field label="Mức độ hài lòng">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <RatingStars
                  value={Number(rating)}
                  onChange={(value) => setRating(String(value))}
                  interactive={!hasReviewed}
                />
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {rating}/5 sao
                </p>
              </div>
            </Field>
            <Field label="Nhận xét">
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Chia sẻ về chất lượng hợp tác, giao tiếp và tiến độ..."
                disabled={hasReviewed}
              />
            </Field>
            <Button type="submit" loading={submitting} disabled={!selectedContract || hasReviewed}>
              <Star className="h-4 w-4" />
              {hasReviewed ? "Đã đánh giá hợp đồng này" : "Gửi đánh giá"}
            </Button>
              </form>
            </>
          ) : (
            <Notice tone="info" title="Chưa chọn hợp đồng">
              Chọn một thẻ “Chưa đánh giá” ở bước 1. Biểu mẫu sẽ mở ngay tại đây.
            </Notice>
          )}
        </Card>

        <Card className="p-6">
          <SectionHeading
            title="Bước 3 · Lịch sử đánh giá"
            description={
              selectedContract
                ? `${contractLabel(selectedContract)} · ${reviews.length} đánh giá`
                : "Chọn hợp đồng để xem lịch sử đánh giá."
            }
          />
          {selectedContract && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50 p-4">
              <div>
                <p className="text-sm font-extrabold text-ink">Điểm trung bình</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Dựa trên đánh giá của các bên trong hợp đồng này
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-amber-600">
                  {averageRating ? averageRating.toFixed(1) : "—"}
                </span>
                <RatingStars value={Math.round(averageRating)} />
              </div>
            </div>
          )}
          <div className="mt-5 grid gap-3">
            {reviews.map((review) => (
              <div
                key={review.reviewId}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-ink">
                      {review.reviewerId === session?.accountId
                        ? `Bạn đã đánh giá ${partnerType}`
                        : `Đánh giá từ ${partnerType}`}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {review.reviewerName || "Thành viên hợp đồng"}
                    </p>
                  </div>
                  <Badge tone="amber">
                    <Star className="h-3.5 w-3.5 fill-current" />{" "}
                    {review.rating}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {review.comment || "Không có nhận xét."}
                </p>
                {review.createdAt && (
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    {formatDate(review.createdAt)}
                  </p>
                )}
              </div>
            ))}
            {reviews.length === 0 && (
              <EmptyState
                title="Chưa có đánh giá"
                description="Đánh giá của hợp đồng đang chọn sẽ hiển thị ở đây."
                action={
                  activeContractId > 0 ? (
                    <LinkButton
                      to={`/app/contracts/${activeContractId}`}
                      variant="secondary"
                      size="sm"
                    >
                      Xem hợp đồng
                    </LinkButton>
                  ) : undefined
                }
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
