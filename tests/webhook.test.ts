import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { describe, it } from 'node:test'
import { verifyStripeSignature } from '../netlify/lib/stripe.ts'

const secret = 'whsec_test_secret'
const body = '{"id":"evt_1","type":"checkout.session.completed"}'
const sign = (t: number, payload = body, key = secret) => createHmac('sha256', key).update(`${t}.${payload}`).digest('hex')

describe('verifyStripeSignature', () => {
  const now = 1_760_000_000
  it('accepts a valid signature', () => {
    assert.equal(verifyStripeSignature(body, `t=${now},v1=${sign(now)}`, secret, now), true)
  })
  it('accepts when one of several v1 signatures matches', () => {
    assert.equal(verifyStripeSignature(body, `t=${now},v1=deadbeef,v1=${sign(now)}`, secret, now), true)
  })
  it('rejects tampered bodies, wrong secrets, old timestamps and junk', () => {
    assert.equal(verifyStripeSignature(body + ' ', `t=${now},v1=${sign(now)}`, secret, now), false)
    assert.equal(verifyStripeSignature(body, `t=${now},v1=${sign(now, body, 'other')}`, secret, now), false)
    assert.equal(verifyStripeSignature(body, `t=${now - 301},v1=${sign(now - 301)}`, secret, now), false)
    assert.equal(verifyStripeSignature(body, null, secret, now), false)
    assert.equal(verifyStripeSignature(body, 'garbage', secret, now), false)
    assert.equal(verifyStripeSignature(body, `t=${now},v1=${sign(now)}`, '', now), false)
  })
})
