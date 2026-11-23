This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

## Network requests

The browser sends registry list, search, record lookup, source metadata, and deployed-code queries directly to dRPC with `finality: 'final'`. The public, keyless endpoints are `https://near.drpc.org` for Mainnet and `https://near-testnet.drpc.org` for Testnet. [NEAR RPC provider list](https://docs.near.org/api/rpc/providers)

The registry rows show recorded verifications. The contract workspace checks deployed code when opened, including through legacy `/code` links.

Registry totals come from the REST API configured by `NEXT_PUBLIC_API_HOST`. IPFS source snapshots use the app's `/api/proxy-ipfs` route.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
