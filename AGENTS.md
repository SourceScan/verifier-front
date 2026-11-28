# Verifier frontend

- Use Conventional Commits for commit messages, PR titles, and squash merges.
- Use **Why**, **Change**, and **Validation** sections by default in PR descriptions. Explain the reason, summarize what changed, and report what was actually checked. Reserve comments for decisions, blockers, and review replies.
- Install dependencies and run builds in a fresh development VM. For frontend changes, run `npm ci`, `npm run lint`, `npm run build`, and `npm test` from the repository root. CI runs the same checks on Node 24.
- For registry or contract-page changes, check both Mainnet and Testnet in a browser. Keep a recorded verification distinct from a match with the currently deployed code. An RPC failure must show an unknown status, never a match or mismatch.
- `npm test` runs `tests/**/*.test.cjs` with the Node test runner, which loads `.ts` modules directly (Node 22.18 or later). Put tested logic in modules whose `@/` imports are type-only.
