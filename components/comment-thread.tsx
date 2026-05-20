"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useFormStatus } from "react-dom";
import { z } from "zod";
import { MessageCircle, Trash2 } from "lucide-react";
import { FormToast } from "@/components/form-toast";
import { addComment, deleteComment, type CommentActionState } from "@/lib/actions/social";
import type { Comment } from "@/lib/types";
import { commentFormSchema } from "@/lib/validation";
import { Button } from "@/components/ui";

type CommentThreadProps = {
  comments: Comment[];
  currentUserId: string | null;
  recipeId: string;
  recipeSlug: string;
};

type CommentFormValues = z.input<typeof commentFormSchema>;

const initialState: CommentActionState = {};

function errorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}

function DeleteCommentButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ghost"
      className="min-h-8 rounded-xl px-2 text-[11px] text-danger hover:bg-danger/10 hover:text-danger"
      disabled={pending}
      aria-label={label}
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
      {pending ? "იშლება..." : "წაშლა"}
    </Button>
  );
}

export function CommentThread({ comments, currentUserId, recipeId, recipeSlug }: CommentThreadProps) {
  const [state, formAction, actionPending] = useActionState(addComment, initialState);
  const [transitionPending, startTransition] = useTransition();
  const isPending = actionPending || transitionPending;
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<CommentFormValues>({
    defaultValues: {
      body: "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
    resolver: zodResolver(commentFormSchema),
  });
  const bodyError = errorMessage(errors.body) ?? state.fieldErrors?.body;

  useEffect(() => {
    if (state.ok) {
      reset();
    }
  }, [reset, state.ok]);

  function submitForm(values: CommentFormValues) {
    if (isPending) return;

    const formData = new FormData();
    formData.set("recipeId", recipeId);
    formData.set("recipeSlug", recipeSlug);
    formData.set("redirectTo", `/recipes/${recipeSlug}`);
    formData.set("body", values.body);

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <article className="soft-card rounded-[28px] p-5 md:p-6">
      <h2 className="text-[23px] font-black leading-tight">კომენტარები</h2>
      <form onSubmit={handleSubmit(submitForm)} className="mt-5 grid gap-3" noValidate>
        <input type="hidden" name="recipeId" value={recipeId} />
        <input type="hidden" name="recipeSlug" value={recipeSlug} />
        <input type="hidden" name="redirectTo" value={`/recipes/${recipeSlug}`} />
        <textarea
          className="field-control min-h-[120px] resize-y py-4"
          placeholder="დატოვე შენიშვნა, ცვლილება ან კითხვა..."
          maxLength={2000}
          aria-invalid={Boolean(bodyError)}
          aria-describedby={bodyError || state.formError ? "comment-form-error" : undefined}
          disabled={isPending}
          {...register("body")}
        />
        {bodyError || state.formError ? (
          <p id="comment-form-error" className="text-xs font-extrabold text-danger" role={state.formError ? "alert" : undefined} aria-live="polite">
            {bodyError ?? state.formError}
          </p>
        ) : null}
        <Button type="submit" className="justify-self-start" disabled={isPending}>
          <MessageCircle className="h-4 w-4" aria-hidden />
          {isPending ? "იგზავნება..." : "კომენტარის დამატება"}
        </Button>
      </form>
      <FormToast message={state.message} toastKey={state.toastKey} />

      <div className="mt-5 grid">
        {comments.length === 0 ? (
          <p className="rounded-[22px] border border-oat bg-[#FAF6F0] p-4 text-sm font-bold leading-relaxed text-muted">
            კომენტარი ჯერ არ არის.
          </p>
        ) : null}
        {comments.map((comment) => {
          const canDelete = Boolean(currentUserId && comment.userId === currentUserId);

          return (
            <div key={comment.id} className="grid grid-cols-[42px_1fr] gap-3 border-t border-oat py-5 first:border-t-0 first:pt-0">
              <div className="grid h-[42px] w-[42px] place-items-center rounded-full bg-sage-light text-[13px] font-black text-sage" aria-hidden="true">
                {comment.avatarInitial}
              </div>
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <strong className="block text-sm font-black">{comment.author}</strong>
                  {canDelete ? (
                    <form action={deleteComment}>
                      <input type="hidden" name="commentId" value={comment.id} />
                      <input type="hidden" name="recipeSlug" value={recipeSlug} />
                      <input type="hidden" name="redirectTo" value={`/recipes/${recipeSlug}`} />
                      <DeleteCommentButton label={`წაშლა: ${comment.author} კომენტარი`} />
                    </form>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{comment.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
