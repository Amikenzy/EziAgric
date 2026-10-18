# Architecture diagrams as code

The architecture of this system lives here, not in a slide deck. Every diagram is
a Mermaid block committed next to a rendered preview, so it is reviewable in a
pull request diff and checkable in CI.

| Document | Diagram | Preview |
| --- | --- | --- |
| [system-context.md](system-context.md) | System context (who and what the platform talks to) | [rendered/system-context.svg](rendered/system-context.svg) |
| [containers.md](containers.md) | Containers (deployable pieces and where state lives) | [rendered/containers.svg](rendered/containers.svg) |
| [sequences/trade-lifecycle.md](sequences/trade-lifecycle.md) | Trade lifecycle, and partial delivery with pro-rata settlement | [rendered/trade-lifecycle.svg](rendered/trade-lifecycle.svg), [rendered/partial-delivery.svg](rendered/partial-delivery.svg) |
| [sequences/dispute.md](sequences/dispute.md) | Dispute: vote, quorum, resolution | [rendered/dispute.svg](rendered/dispute.svg) |

Cross-references back into the code use the repository's `docref` anchor
convention, checked by `node scripts/check-doc-refs.mjs`:

```markdown
<!-- docref: contracts/amana_escrow/src/lib.rs#confirm_partial_delivery -->
```

## Editing a diagram

1. Edit the `mermaid` block in the document — the block is the source of truth.
2. Regenerate the preview next to it:

   ```bash
   node scripts/check-architecture-diagrams.mjs --render
   ```

   That shells out to `@mermaid-js/mermaid-cli` (headless Chromium, so it needs
   network access on the first run). Both the block and the regenerated SVG are
   committed together.
3. Check the result the way CI does — no network needed:

   ```bash
   node scripts/check-architecture-diagrams.mjs
   node scripts/check-doc-refs.mjs
   ```

The check fails when a diagram has no preview, when a quoted label in the
Mermaid source is missing from the committed preview (a stale render), when a
preview is not referenced by any document, or when a relative link between these
documents points at a file that does not exist.

## What counts as arch-affecting

Update the relevant diagram in the same pull request when a change:

- adds or removes a component, container or external service, or the direction
  of a call between them (**system context**, **containers**);
- changes who may call an entry point, or the order of messages that settle a
  trade (**trade lifecycle**, **partial delivery**);
- changes the dispute flow: who initiates, who votes, how quorum or the fallback
  resolution works (**dispute**);
- adds a new storage key or event that other components consume — that also
  means updating [`docs/eziagric_contract_overview.md`](../eziagric_contract_overview.md).

Refactors that keep every arrow and every state transition identical (a module
split, a rename with no ABI change) do not need a diagram update. When in doubt,
say in the PR description why no diagram changed.

## CI

`.github/workflows/ci.yml` runs the `Architecture Diagrams Required Gate` job for
any pull request touching `docs/**` (see README → *Required PR CI Gates*). It runs
the check above plus the documentation reference check, so a broken diagram link
or a stale preview fails the build instead of living on in the docs.
