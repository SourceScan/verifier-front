import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readDeployedCodeHash } from './deployedCode.ts'

// 44-character base58 strings below 'J…' decode to exactly 32 bytes.
const hash = (c) => '2' + c.repeat(43)
const LOCAL = hash('a')
const GLOBAL = hash('b')
const BLOCK = hash('c')
const OTHER_BLOCK = hash('d')
const WASM = hash('e')
const NO_LOCAL_CODE = '1'.repeat(32)

const account = (fields) => ({ amount: '1', locked: '0', storage_usage: 182, storage_paid_at: 0, block_height: 1, block_hash: BLOCK, ...fields })
const code = (fields) => ({ code_base64: 'AGFzbQ==', hash: WASM, block_height: 1, block_hash: BLOCK, ...fields })

/** Fake RPC that answers view_account / view_code (or throws them) and records each request. */
function rpc(viewAccount, viewCode = code()) {
  const calls = []
  const query = async (params, blockHash) => {
    calls.push({ ...params, blockHash })
    const answer = params.request_type === 'view_account' ? viewAccount : viewCode
    if (answer instanceof Error) throw answer
    return answer
  }
  return { calls, query }
}

const atFinal = { request_type: 'view_account', account_id: 'app.near', blockHash: undefined }
const codeAtBlock = { request_type: 'view_code', account_id: 'app.near', blockHash: BLOCK }

test('an ordinary contract costs one view_account at the latest final block and no view_code', async () => {
  for (const fields of [{ code_hash: LOCAL }, { code_hash: LOCAL, global_contract_hash: null, global_contract_account_id: null }]) {
    const { calls, query } = rpc(account(fields))
    assert.equal(await readDeployedCodeHash(query, 'app.near'), LOCAL)
    assert.deepEqual(calls, [atFinal])
  }
})

test('a global contract by hash is its global hash, without view_code', async () => {
  for (const codeHash of [NO_LOCAL_CODE, GLOBAL]) {
    const { calls, query } = rpc(account({ code_hash: codeHash, global_contract_hash: GLOBAL }))
    assert.equal(await readDeployedCodeHash(query, 'app.near'), GLOBAL)
    assert.deepEqual(calls, [atFinal])
  }
})

test('by-account, absent and ambiguous answers read view_code at the block view_account returned', async () => {
  const cases = {
    'global by account': { code_hash: NO_LOCAL_CODE, global_contract_account_id: 'lib.near' },
    'no local code, no global fields (none, or a node that omits them)': { code_hash: NO_LOCAL_CODE },
    'both global fields': { code_hash: NO_LOCAL_CODE, global_contract_hash: GLOBAL, global_contract_account_id: 'lib.near' },
    'local code hash and a different global hash': { code_hash: LOCAL, global_contract_hash: GLOBAL },
    'local code hash and a global account': { code_hash: LOCAL, global_contract_account_id: 'lib.near' },
  }
  for (const [name, fields] of Object.entries(cases)) {
    const { calls, query } = rpc(account(fields))
    assert.equal(await readDeployedCodeHash(query, 'app.near'), WASM, name)
    assert.deepEqual(calls, [atFinal, codeAtBlock], name)
  }
})

test('the view_code fallback fails closed unless it answers for that block with a valid hash', async () => {
  const cases = {
    'another block': code({ block_hash: OTHER_BLOCK }),
    'no block hash': code({ block_hash: undefined }),
    'no hash': code({ hash: undefined }),
    'malformed hash': code({ hash: 'not-a-hash' }),
    'null answer': null,
  }
  for (const [name, answer] of Object.entries(cases)) {
    const { query } = rpc(account({ code_hash: NO_LOCAL_CODE }), answer)
    await assert.rejects(readDeployedCodeHash(query, 'app.near'), /Unexpected view_code response/, name)
  }
})

test('malformed view_account answers fail closed without a view_code request', async () => {
  const cases = {
    null: null,
    string: 'account',
    array: [],
    'no code hash': account({}),
    'short code hash': account({ code_hash: 'abc' }),
    'code hash longer than 32 bytes': account({ code_hash: 'z'.repeat(44) }),
    'code hash with a non-base58 character': account({ code_hash: '2' + 'l'.repeat(43) }),
    'numeric code hash': account({ code_hash: 7 }),
    'no block hash': account({ code_hash: LOCAL, block_hash: undefined }),
    'malformed block hash': account({ code_hash: LOCAL, block_hash: 42 }),
    'numeric global hash': account({ code_hash: NO_LOCAL_CODE, global_contract_hash: 42 }),
    'empty global hash': account({ code_hash: NO_LOCAL_CODE, global_contract_hash: '' }),
    'malformed global hash': account({ code_hash: LOCAL, global_contract_hash: 'abc' }),
    'numeric global account': account({ code_hash: NO_LOCAL_CODE, global_contract_account_id: 7 }),
    'empty global account': account({ code_hash: NO_LOCAL_CODE, global_contract_account_id: '' }),
  }
  for (const [name, answer] of Object.entries(cases)) {
    const { calls, query } = rpc(answer)
    await assert.rejects(readDeployedCodeHash(query, 'app.near'), /Unexpected view_account response/, name)
    assert.equal(calls.length, 1, name)
  }
})

test('RPC errors reach the caller unchanged, from either request', async () => {
  const unknownAccount = Object.assign(new Error('does not exist'), { kind: 'unknown_account' })
  await assert.rejects(readDeployedCodeHash(rpc(unknownAccount).query, 'app.near'), (error) => error === unknownAccount)

  const noCode = Object.assign(new Error('never been observed'), { kind: 'no_contract_code' })
  await assert.rejects(readDeployedCodeHash(rpc(account({ code_hash: NO_LOCAL_CODE }), noCode).query, 'app.near'), (error) => error === noCode)
})
