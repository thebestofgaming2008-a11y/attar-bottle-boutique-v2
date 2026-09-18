import { useRef, useState, type FormEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Star, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProductReview } from "@/services/reviewService";
import { prepareReviewPhoto } from "@/lib/reviewPhoto";

export function ProductReviews({
  reviews,
  productId,
  productName,
}: {
  reviews: ProductReview[];
  productId?: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const [formCreated, setFormCreated] = useState(false);
  const [limit, setLimit] = useState(6);
  const average = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : null;
  return (
    <section id="reviews" className="border-t border-black/10 bg-white px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl sm:text-4xl">Customer reviews</h2>
            <p className="mt-3 text-sm text-black/65">
              {average
                ? `${average} / 5 · ${reviews.length} verified ${reviews.length === 1 ? "review" : "reviews"}`
                : `Tried ${productName}? Share your experience.`}
            </p>
          </div>
          {productId ? (
            <Button
              variant="outline"
              className="min-h-12 rounded-none px-6"
              aria-expanded={open}
              aria-controls="product-review-form"
              onClick={() => {
                setFormCreated(true);
                setOpen(!open);
              }}
            >
              {open ? "Close form" : "Write a review"}
            </Button>
          ) : null}
        </div>
        {formCreated && productId ? (
          <div hidden={!open}>
            <ReviewForm key={productId} productId={productId} productName={productName} />
          </div>
        ) : null}
        {reviews.length ? (
          <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {reviews.slice(0, limit).map((review) => (
              <article key={review.id} className="border-t border-black/10 pt-6">
                <div aria-label={`${review.rating} out of 5 stars`} className="mb-4 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      aria-hidden="true"
                      key={star}
                      className={`h-4 w-4 ${star <= review.rating ? "fill-current" : ""}`}
                    />
                  ))}
                </div>
                {review.title ? <h3 className="mb-2 font-semibold">{review.title}</h3> : null}
                <p className="break-words text-sm leading-7">{review.body}</p>
                {review.media_urls?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {review.media_urls.slice(0, 3).map((url, index) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open customer photo ${index + 1} of ${productName}`}
                        className="block h-24 w-24 bg-black/5 focus-visible:outline-2"
                      >
                        <img
                          src={url}
                          alt={`Customer photo of ${productName}`}
                          loading="lazy"
                          decoding="async"
                          width={96}
                          height={96}
                          className="h-full w-full object-contain"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}
                <p className="mt-5 text-xs text-black/60">
                  {review.customer_name || "Customer"} · Verified purchase
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-8 text-sm text-black/60">
            No reviews yet. Be the first to review this fragrance.
          </p>
        )}
        {reviews.length > limit ? (
          <Button
            variant="outline"
            className="mt-8 rounded-none"
            onClick={() => setLimit(limit + 6)}
          >
            Show more reviews
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function ReviewForm({ productId, productName }: { productId: string; productName: string }) {
  const { user } = useAuth();
  const eligibility = useQuery(api.reviews.canReviewProduct, user ? { productId } : "skip");
  const submitAccount = useMutation(api.reviews.submit);
  const submitGuest = useMutation(api.reviews.submitForOrder);
  const uploadPhoto = useAction(api.reviewPhotos.upload);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [savedId, setSavedId] = useState<Id<"reviews"> | null>(null);
  const [uploaded, setUploaded] = useState(0);
  const lock = useRef(false);
  const savedProof = useRef<{ orderNumber?: string; email?: string }>({});
  const accountEligible = Boolean(user && eligibility?.canReview);
  const addPhotos = async (files: FileList | null) => {
    if (!files || lock.current) return;
    if (photos.length + files.length > 3) {
      setError("Choose up to 3 photos.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const prepared: string[] = [];
      for (const file of Array.from(files)) prepared.push(await prepareReviewPhoto(file));
      setPhotos((current) => [...current, ...prepared]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not prepare the photos.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    if (!rating) {
      setError("Choose a star rating.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    let id = savedId;
    try {
      if (!id) {
        const feedback = { productId, rating, body: body.trim() };
        const proof = accountEligible
          ? {}
          : { orderNumber: orderNumber.trim(), email: email.trim().toLowerCase() };
        const review = accountEligible
          ? await submitAccount(feedback)
          : await submitGuest({
              ...feedback,
              orderNumber: orderNumber.trim(),
              email: email.trim().toLowerCase(),
            });
        if (!review?.id) throw new Error("Review could not be saved.");
        id = review.id as Id<"reviews">;
        setSavedId(id);
        savedProof.current = proof;
      }
      for (let index = uploaded; index < photos.length; index++) {
        await uploadPhoto({ reviewId: id, data: photos[index], ...savedProof.current });
        setUploaded(index + 1);
      }
      setDone(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
              .replace(/\[CONVEX[^\]]*\]\s*/g, "")
              .replace(/\[Request ID:[^\]]*\]\s*/g, "")
              .replace(/Server Error\s*/g, "")
              .split("Called by client")[0]
              .trim()
          : "Please try again.";
      setError(
        id ? `Your written review is saved. A photo could not be added. ${message}` : message,
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  if (done)
    return (
      <div id="product-review-form" role="status" className="mt-8 border border-black/15 p-6">
        <h3 className="font-semibold">Thank you for your review.</h3>
        <p className="mt-2 text-sm text-black/65">It will appear here after approval.</p>
      </div>
    );
  return (
    <form
      id="product-review-form"
      onSubmit={submit}
      className="mt-8 max-w-2xl space-y-6 border border-black/15 p-5 sm:p-8"
      aria-label={`Review ${productName}`}
    >
      <p className="text-sm text-black/65">
        Reviews are from verified buyers and checked before publication.
      </p>
      <fieldset disabled={busy || Boolean(savedId)} className="space-y-6">
        {!accountEligible ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span>Order number</span>
              <Input
                required
                maxLength={40}
                value={orderNumber}
                onChange={(event) => setOrderNumber(event.target.value)}
                placeholder="e.g. #123"
                className="h-12 rounded-none"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span>Order email</span>
              <Input
                required
                type="email"
                autoComplete="email"
                maxLength={180}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 rounded-none"
              />
            </label>
          </div>
        ) : null}
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Your rating</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <label key={star} className="cursor-pointer p-2">
                <input
                  type="radio"
                  name="review-rating"
                  value={star}
                  checked={rating === star}
                  onChange={() => setRating(star)}
                  className="peer sr-only"
                  aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                />
                <Star
                  aria-hidden="true"
                  className={`h-7 w-7 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 ${star <= rating ? "fill-current" : "text-black/40"}`}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Your review</span>
          <Textarea
            required
            maxLength={1600}
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="How did the fragrance feel, smell and last?"
            className="rounded-none text-base"
          />
        </label>
        <div>
          <label className="inline-flex min-h-11 cursor-pointer items-center border border-black/25 px-4 text-sm focus-within:outline-2">
            Add photos (optional)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="sr-only"
              disabled={photos.length >= 3}
              onChange={(event) => {
                void addPhotos(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-black/60">
            Up to 3 photos, 12 MB each. Only upload photos you own; don’t include personal details.
            Approved photos are public.
          </p>
          {photos.length ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {photos.map((photo, index) => (
                <div key={photo} className="relative h-24 w-24 bg-black/5">
                  <img
                    src={`data:image/webp;base64,${photo}`}
                    alt={`Selected review photo ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                  <button
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                    className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center border bg-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm leading-6 text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-4">
        <Button
          type="submit"
          disabled={busy || Boolean(user && eligibility === undefined)}
          className="min-h-12 rounded-none bg-black px-7 text-white"
        >
          {busy ? "Please wait…" : savedId ? "Retry remaining photos" : "Submit review"}
        </Button>
        {savedId && !busy ? (
          <Button type="button" variant="ghost" onClick={() => setDone(true)}>
            Finish without remaining photos
          </Button>
        ) : null}
      </div>
    </form>
  );
}
