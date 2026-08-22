import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { normalizeHeadline, normalizeReferralCode, normalizeSocialFormat, renderAffiliateSocialSvg } from '../lib/affiliate-social-assets'

describe('affiliate social assets', () => {
  test('normalizes public query parameters', () => {
    assert.equal(normalizeSocialFormat('story'), 'story')
    assert.equal(normalizeSocialFormat('unknown'), 'square')
    assert.equal(normalizeReferralCode(' ab<script>_12 '), 'ABSCRIPT_12')
    assert.equal(normalizeHeadline('Hello\u0000   world'), 'Hello world')
  })
  test('renders each supported dimension', () => {
    assert.match(renderAffiliateSocialSvg({ format: 'square', headline: 'Hello', referralCode: 'ABC' }), /width="1080" height="1080"/)
    assert.match(renderAffiliateSocialSvg({ format: 'story', headline: 'Hello', referralCode: 'ABC' }), /width="1080" height="1920"/)
    assert.match(renderAffiliateSocialSvg({ format: 'banner', headline: 'Hello', referralCode: 'ABC' }), /width="1200" height="630"/)
  })
  test('escapes user-controlled markup', () => {
    const svg = renderAffiliateSocialSvg({ format: 'square', headline: '<script>alert("x")</script>', referralCode: 'ABC' })
    assert.doesNotMatch(svg, /<script>/)
    assert.match(svg, /&lt;script&gt;/)
  })
})
