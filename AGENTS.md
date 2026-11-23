# Verifier frontend

- Use Conventional Commits for commit messages, PR titles, and squash merges.
- Install dependencies and run builds in a fresh development VM. For frontend changes, run `npm ci`, `npm run lint`, and `npm run build` from the repository root.
- For registry or contract-page changes, check both Mainnet and Testnet in a browser. Keep a recorded verification distinct from a match with the currently deployed code. An RPC failure must show an unknown status, never a match or mismatch.
