/**
 * Reads the hash of the code an account runs from the small `view_account`
 * answer, and only falls back to `view_code` (the full WASM) when that answer
 * does not name the hash itself. No imports, so tests run it under plain Node.
 */

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
/** CryptoHash::default(): the `code_hash` view_account reports without local code. */
const NO_LOCAL_CODE = '11111111111111111111111111111111'
const ACCOUNT_ID = /^[a-z\d._-]{2,64}$/

/** A base58 NEAR CryptoHash that decodes to exactly 32 bytes. */
function isCryptoHash(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 32 || value.length > 44) return false
  const bytes: number[] = [] // little-endian, without leading zero bytes
  for (let i = 0; i < value.length; i++) {
    let carry = ALPHABET.indexOf(value[i])
    if (carry < 0) return false
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58
      bytes[j] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      bytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  let zeros = 0
  while (value[zeros] === '1') zeros++
  return zeros + bytes.length === 32
}

const absent = (value: unknown) => value === undefined || value === null

type AccountCode = { kind: 'hash'; hash: string } | { kind: 'view_code'; blockHash: string }

/** What a view_account answer says about the account's code; null when it is malformed. */
function readAccount(view: unknown): AccountCode | null {
  if (!view || typeof view !== 'object') return null
  const {
    code_hash: codeHash,
    block_hash: blockHash,
    global_contract_hash: byHash,
    global_contract_account_id: byAccount,
  } = view as Record<string, unknown>
  if (!isCryptoHash(codeHash) || !isCryptoHash(blockHash)) return null
  if (!absent(byHash) && !isCryptoHash(byHash)) return null
  if (!absent(byAccount) && !(typeof byAccount === 'string' && ACCOUNT_ID.test(byAccount))) return null
  const local = codeHash !== NO_LOCAL_CODE
  // An ordinary contract.
  if (local && absent(byHash) && absent(byAccount)) return { kind: 'hash', hash: codeHash }
  // A global contract by hash: that hash is the code's own hash.
  if (isCryptoHash(byHash) && absent(byAccount) && (!local || codeHash === byHash)) return { kind: 'hash', hash: byHash }
  // A global contract by account, no local code (or a node that does not
  // report global contracts), or an ambiguous mix: read the code itself.
  return { kind: 'view_code', blockHash }
}

/** One read-only query; without `blockHash` it is answered at the latest final block. */
export type CodeQuery = (
  _params: { request_type: 'view_account' | 'view_code'; account_id: string },
  _blockHash?: string
) => Promise<unknown>

/**
 * Hash of the code `accountId` runs. `view_account` at the latest final block
 * answers for ordinary contracts and global contracts by hash; any other
 * account is read with `view_code` at the block that answer came from, so both
 * reads describe one chain state. RPC errors propagate unchanged for the
 * caller to classify; malformed answers throw.
 */
export async function readDeployedCodeHash(query: CodeQuery, accountId: string): Promise<string> {
  const account = readAccount(await query({ request_type: 'view_account', account_id: accountId }))
  if (!account) throw new Error('Unexpected view_account response')
  if (account.kind === 'hash') return account.hash
  const code = await query({ request_type: 'view_code', account_id: accountId }, account.blockHash)
  const { hash, block_hash: blockHash } = (code && typeof code === 'object' ? code : {}) as Record<string, unknown>
  if (blockHash !== account.blockHash || !isCryptoHash(hash)) throw new Error('Unexpected view_code response')
  return hash
}
