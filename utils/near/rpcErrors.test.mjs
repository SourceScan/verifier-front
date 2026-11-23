import assert from 'node:assert/strict'
import { test } from 'node:test'
import { classify } from './rpcErrors.ts'

const rpcError = (cause, data) => ({ name: 'HANDLER_ERROR', cause: { name: cause, info: {} }, code: -32000, message: 'Server error', data })
const UNKNOWN_BLOCK = 'Block either has never been observed on the node or has been garbage collected: BlockId(Hash(2ccc))'
const NO_CODE = 'Contract code for contract ID #app.near has never been observed on the node at block #1'
const NO_ACCOUNT = 'account app.near does not exist while viewing'

test('an unknown pinned block or any other cause is never read as absence', () => {
  const cases = {
    UNKNOWN_BLOCK: rpcError('UNKNOWN_BLOCK', UNKNOWN_BLOCK),
    GARBAGE_COLLECTED_BLOCK: rpcError('GARBAGE_COLLECTED_BLOCK', UNKNOWN_BLOCK),
    'other cause, no-code wording': rpcError('INTERNAL_ERROR', NO_CODE),
    'other cause, unknown-account wording': rpcError('INTERNAL_ERROR', NO_ACCOUNT),
    'unknown block without a cause': { code: -32000, message: 'Server error', data: UNKNOWN_BLOCK },
  }
  for (const [name, error] of Object.entries(cases)) assert.equal(classify(error).kind, 'unavailable', name)
})

test('absence from a structured cause, or from the legacy message without one', () => {
  assert.equal(classify(rpcError('UNKNOWN_ACCOUNT', NO_ACCOUNT)).kind, 'unknown_account')
  assert.equal(classify(rpcError('NO_CONTRACT_CODE', NO_CODE)).kind, 'no_contract_code')
  assert.equal(classify({ code: -32000, data: NO_ACCOUNT }).kind, 'unknown_account')
  assert.equal(classify({ code: -32000, data: NO_CODE }).kind, 'no_contract_code')
})
