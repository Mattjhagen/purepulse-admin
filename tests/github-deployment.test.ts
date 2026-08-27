import assert from 'node:assert/strict'
import test from 'node:test'
import { ensureGitHubRepository, pagesUrl, repositoryName, verifyGitHubPages } from '../lib/github-deployment'

test('normalizes project names into safe repository names', () => {
  assert.equal(repositoryName(' FuelShield Defense Studio '), 'fuelshield-defense-studio')
  assert.equal(pagesUrl('Mattjhagen', 'fuelshield-defense'), 'https://mattjhagen.github.io/fuelshield-defense/')
})

test('creates a missing repository and verifies its owner', async () => {
  const calls: string[] = []
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push(`${init?.method || 'GET'} ${url}`)
    if (!init?.method) return new Response('', { status: 404 })
    return Response.json({
      name: 'fuelshield-defense',
      html_url: 'https://github.com/Mattjhagen/fuelshield-defense',
      default_branch: 'main',
      owner: { login: 'Mattjhagen' },
    }, { status: 201 })
  }) as typeof fetch

  const repository = await ensureGitHubRepository({
    name: 'fuelshield-defense', token: 'test', owner: 'Mattjhagen', fetcher,
  })
  assert.equal(repository.html_url, 'https://github.com/Mattjhagen/fuelshield-defense')
  assert.deepEqual(calls.map(call => call.split(' ')[0]), ['GET', 'POST'])
})

test('does not report Pages until GitHub confirms it', async () => {
  const missing = (async () => new Response('', { status: 404 })) as typeof fetch
  assert.equal(await verifyGitHubPages({ owner: 'Mattjhagen', repo: 'missing', token: 'test', fetcher: missing }), null)
})
