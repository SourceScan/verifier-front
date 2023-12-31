const rpc = `https://rpc${
  process.env.NEXT_PUBLIC_NETWORK === 'testnet' ? '.testnet' : '.mainnet'
}.near.org`

export { rpc }
