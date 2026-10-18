# Explicit `any` Audit — Backend

Tracks non-test uses of explicit `any` in `backend/src` (issue #602).

## Enforcement

- `@typescript-eslint/no-explicit-any` is `warn` repo-wide (`backend/eslint.config.mjs`).
- It is `error` for the route files that have been cleaned. A file is added to that
  override in `eslint.config.mjs` once its `any` usages are gone, so new `any`
  in those files fails lint.

## Priority: route layer (request parsing / service boundary)

Cleaned (rule set to `error`):

- [x] `routes/job-health.routes.ts` — `jobType` narrowed with an `isJobType` guard to the `JobType` enum; unknown types return 404
- [x] `routes/outbox.routes.ts` — `format` narrowed to `"json" | "csv" | "markdown"`; unknown values return 400
- [x] `routes/escrow.schedule.routes.ts` — delegate args typed with `Prisma.*Args`, results with `MilestoneRecord`
- [x] `routes/stellar.asset.ts` — Horizon asset payload typed as `HorizonAssetRaw`
- [x] `routes/stellar.tx.status.ts` — `xdr` result code casts removed (`catch` still `any`, see below)

Remaining:

- [ ] `routes/stellar.tx.status.ts` — `catch (error: any)`
- [ ] `routes/stellar.account.balance.ts` — `parseBalances(rawBalances: any[])`, `catch (error: any)` ×2
- [ ] `routes/notifications.preferences.routes.ts` — delegate `findUnique`/`upsert` args
- [ ] `routes/escrow.release.routes.ts` — delegate `findMany` args
- [ ] `routes/webhooks.logs.routes.ts` — `as any` on payload
- [ ] `routes/trade.manifest.routes.ts` — `(error as any).status`
- [ ] `routes/wallet.routes.ts` — `req: any` on `authMiddleware` handler
- [ ] `routes/manifest.routes.ts` — `(err as any).status` ×3
- [ ] `routes/trade.export.routes.ts` — `serializeTrade` / `serializeCooperativeTrade` args (`as any` ×4)
- [ ] `routes/trade.routes.ts` — `req.query as any` ×2, `as any[]` event/evidence/notes/disputes, `(manifest as any)` fields

## Middleware, lib, config

- [ ] `app.ts` — monkey-patched express internals (`app as any`, `router.stack`)
- [ ] `middleware/errorHandler.ts`, `middleware/logger.ts`, `middleware/request.logger.middleware.ts`, `middleware/tracing.middleware.ts` — augmenting `req`/`res` (candidate: `declare module "express"` augmentation for `correlationId`, `requestId`, `otelSpan`, `user`)
- [ ] `middleware/validateRequest.ts` — `error as any`, `sanitizeValue(parsed) as any`
- [ ] `middleware/idempotency.ts` — `res.send`/`res.json` overrides typed `body: any`
- [ ] `schemas/trade.schemas.ts`, `schemas/trade.template.schemas.ts` — `superRefine` ctx
- [ ] `config/tracing.ts` — exporters (`any[]`, `prometheusExporter`); `eslint` override already exists for this file, so this is a deliberate exception unless typed
- [ ] `lib/retry.ts` — error-shape probing (`error as any`); candidate: narrow with a `HttpLikeError` type guard
- [ ] `lib/redis.ts`, `lib/redisPolicy.ts` — `(redis as any).on(...)`
- [ ] `lib/traced-http-client.ts` — generic `post/put/patch<T = any>` defaults and `data?: any`
- [ ] `lib/authHelper.ts` — `validateFn` return and `user: any`
- [ ] `lib/outbox/actionEventMapping.ts` — decorator `...args: any[]`
- [ ] `errors/serviceErrorConverter.ts` — `data?: any`

## Jobs

- [ ] `jobs/queue.ts` — connection typing (`as any` ×5)
- [ ] `jobs/heartbeat-wrapper.ts` — `JobProcessor<T = any>`, `let result: any`
- [ ] `jobs/workers/webhook.worker.ts` — `status as any` (should be the webhook status union)

## Services and controllers

- [ ] `services/stellar.service.ts` — Stellar SDK asset/path types (`any` ×9); candidate: `Horizon` / `xdr` SDK types
- [ ] `services/user.service.ts` — `catch (error: any)` ×6
- [ ] `services/auth.service.ts` — `redis as any).getdel` ×7 (candidate: one typed helper)
- [ ] `services/evidence.service.ts` — `file as any`, `lastError: any`, Prisma `as any`
- [ ] `services/eventListener.service.ts`, `services/streamClawback.service.ts` — `as any` on redis/outbox
- [ ] `services/adminAudit.service.ts` — `findMany` args `as any`
- [ ] `services/adminNotification.service.ts` — `(...args: any[])` listeners (candidate: `unknown[]`)
- [ ] `controllers/trade.controller.ts`, `controllers/dispute.controller.ts`, `controllers/disputeCategory.controller.ts` — `error as any`, `req.params/query as any`
