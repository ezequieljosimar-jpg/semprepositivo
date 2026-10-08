<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Kiwify sales arrive at `/api/public/kiwify/webhook` (HMAC-SHA1 `?signature=` with KIWIFY_WEBHOOK_TOKEN) and are persisted only via `record_devotional_purchase_event`; purchases without a confirmed account stay unlinked by email and are claimed on login — why: access is granted only server-side from verified events.
- Home CTA state uses the existing server-verified account read and shared accessDecision through TanStack Query; never infer purchase access from browser storage or progress — why: display stays consistent with backend authorization without changing protected-content rules.
