import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_IN_FLIGHT, createCodeHashQueue } from './codeHashQueue.ts'

/** A fetcher whose requests the test answers by hand. */
function setup() {
  const calls = []
  const fetchCodeHash = (network, accountId) =>
    new Promise((resolve, reject) => calls.push({ key: `${network}:${accountId}`, resolve, reject }))
  return { calls, ...createCodeHashQueue(fetchCodeHash) }
}
const settle = () => new Promise((resolve) => setImmediate(resolve))

test('one request per network and account, shared by every subscriber', async () => {
  const { calls, subscribe } = setup()
  const a = subscribe('mainnet', 'app.near')
  const b = subscribe('mainnet', 'app.near')
  subscribe('testnet', 'app.near')
  assert.deepEqual(calls.map((c) => c.key), ['mainnet:app.near', 'testnet:app.near'])
  calls[0].resolve('H')
  assert.equal(await a.promise, 'H')
  assert.equal(await b.promise, 'H')
})

test(`at most ${MAX_IN_FLIGHT} requests run at once, and released queued rows are dropped`, async () => {
  const { calls, subscribe } = setup()
  const rows = Array.from({ length: MAX_IN_FLIGHT + 2 }, (_, i) => subscribe('mainnet', `row${i}.near`))
  assert.equal(calls.length, MAX_IN_FLIGHT)
  rows[MAX_IN_FLIGHT].release() // scrolled away before it started
  calls[0].resolve('H')
  await settle()
  assert.deepEqual(calls.slice(MAX_IN_FLIGHT).map((c) => c.key), [`mainnet:row${MAX_IN_FLIGHT + 1}.near`])
})

test('registry rows reuse a completed answer', async () => {
  const { calls, subscribe } = setup()
  const first = subscribe('mainnet', 'app.near')
  calls[0].resolve('H')
  await first.promise
  await settle()
  first.release()
  assert.equal(await subscribe('mainnet', 'app.near').promise, 'H')
  assert.equal(calls.length, 1)
})

test("the contract page never reuses a row's completed answer, and later rows reuse the page's", async () => {
  const { calls, subscribe } = setup()
  const row = subscribe('mainnet', 'app.near')
  calls[0].resolve('OLD')
  await row.promise
  await settle()
  row.release()

  const page = subscribe('mainnet', 'app.near', { fresh: true })
  assert.equal(calls.length, 2)
  calls[1].resolve('NEW')
  assert.equal(await page.promise, 'NEW')
  await settle()

  assert.equal(await subscribe('mainnet', 'app.near').promise, 'NEW')
  assert.equal(calls.length, 2)
})

test('a fresh subscriber joins a request that is still in flight', async () => {
  const { calls, subscribe } = setup()
  subscribe('mainnet', 'app.near')
  const page = subscribe('mainnet', 'app.near', { fresh: true })
  assert.equal(calls.length, 1)
  calls[0].resolve('H')
  assert.equal(await page.promise, 'H')
})

test('failures are never cached', async () => {
  const { calls, subscribe } = setup()
  const first = subscribe('mainnet', 'app.near')
  calls[0].reject(new Error('RPC unavailable'))
  await assert.rejects(first.promise, /RPC unavailable/)
  await settle()
  subscribe('mainnet', 'app.near')
  assert.equal(calls.length, 2)
})
