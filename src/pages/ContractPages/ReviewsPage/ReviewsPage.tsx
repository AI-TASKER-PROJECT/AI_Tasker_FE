import { Download, Star } from "lucide-react";
import { FormEvent, useState } from "react";
import { adminApi } from "../../../lib/api";
import type { Review } from "../../../types";
import { Badge, Button, Card, Field, Input, Notice, PageHeader, SectionHeading, Textarea } from "../../../components/ui";

export function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [form, setForm] = useState({
    contractId: "",
    rating: "5",
    comment: "",
  });
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const contractId = Number(form.contractId);
    const rating = Number(form.rating);
    if (
      !Number.isFinite(contractId) ||
      contractId <= 0 ||
      !Number.isFinite(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      setMessage(
        "Contract ID phải là số dương và rating nằm trong khoảng 1-5.",
      );
      return;
    }
    setMessage("");
    const review = await adminApi.createReview({
      contractId,
      rating,
      comment: form.comment,
    });
    setReviews((items) => [...items, review]);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-[radial-gradient(circle_at_top_left,#f0f7ff,transparent_38%),linear-gradient(135deg,#ffffff_0%,#eef4ff_55%,#f5f0ff_100%)] p-6 shadow-card md:p-8">
        <PageHeader
          title="Đánh giá chéo"
          description="Hai bên đánh giá sau khi hợp đồng Completed/Terminated/Cancelled."
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="p-6">
          <SectionHeading title="Gửi review" />
          <form onSubmit={submit} className="mt-5 grid gap-4">
            <Field label="Contract ID">
              <Input
                type="number"
                min={1}
                value={form.contractId}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    contractId: event.target.value,
                  }))
                }
                required
              />
            </Field>
            <Field label="Rating 1-5">
              <Input
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={(event) =>
                  setForm((value) => ({ ...value, rating: event.target.value }))
                }
                required
              />
            </Field>
            <Field label="Nhận xét">
              <Textarea
                value={form.comment}
                onChange={(event) =>
                  setForm((value) => ({
                    ...value,
                    comment: event.target.value,
                  }))
                }
              />
            </Field>
            <Button type="submit">
              <Star className="h-4 w-4" /> Gửi đánh giá
            </Button>
          </form>
          {message && <Notice tone="danger" title={message} className="mt-4" />}
        </Card>
        <Card className="p-6">
          <SectionHeading
            title="Review theo hợp đồng"
            action={
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4" /> Export UI
              </Button>
            }
          />
          <div className="mt-5 grid gap-3">
            {reviews.map((review) => (
              <div
                key={review.reviewId}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-extrabold text-ink">
                    {review.reviewerName || `Reviewer #${review.reviewerId}`}
                  </p>
                  <Badge tone="amber">
                    <Star className="h-3.5 w-3.5 fill-current" />{" "}
                    {review.rating}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
