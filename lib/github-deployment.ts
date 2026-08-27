const GITHUB_API = 'https://api.github.com'

export interface GitHubRepository {
  name: string
  html_url: string
  default_branch: string | null
  owner: { login: string }
}

function githubHeaders(token: string) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export function repositoryName(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)

  if (!slug) throw new Error('A valid project name is required to create a repository')
  return slug
}

export function pagesUrl(owner: string, repo: string) {
  return `https://${owner.toLowerCase()}.github.io/${repo}/`
}

export async function ensureGitHubRepository(input: {
  name: string
  description?: string | null
  token?: string
  owner?: string
  fetcher?: typeof fetch
}) {
  const token = input.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  const owner = input.owner || process.env.GITHUB_OWNER || 'Mattjhagen'
  const fetcher = input.fetcher || fetch
  const name = repositoryName(input.name)

  if (!token) throw new Error('GitHub provisioning is unavailable: GITHUB_TOKEN is not configured')

  const existing = await fetcher(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, {
    headers: githubHeaders(token),
    cache: 'no-store',
  })

  if (existing.ok) return (await existing.json()) as GitHubRepository
  if (existing.status !== 404) {
    throw new Error(`GitHub repository lookup failed (${existing.status})`)
  }

  const created = await fetcher(`${GITHUB_API}/user/repos`, {
    method: 'POST',
    headers: githubHeaders(token),
    body: JSON.stringify({
      name,
      description: input.description || `Website project: ${input.name}`,
      private: false,
      auto_init: true,
    }),
  })

  if (!created.ok) {
    const detail = await created.text()
    throw new Error(`GitHub repository creation failed (${created.status}): ${detail.slice(0, 200)}`)
  }

  const repository = (await created.json()) as GitHubRepository
  if (repository.owner.login.toLowerCase() !== owner.toLowerCase()) {
    throw new Error(`GitHub created the repository under ${repository.owner.login}, not ${owner}`)
  }
  return repository
}

export async function verifyGitHubPages(input: {
  owner: string
  repo: string
  token?: string
  fetcher?: typeof fetch
}) {
  const token = input.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  const fetcher = input.fetcher || fetch
  if (!token) throw new Error('GitHub Pages verification is unavailable: GITHUB_TOKEN is not configured')

  const response = await fetcher(
    `${GITHUB_API}/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pages`,
    { headers: githubHeaders(token), cache: 'no-store' },
  )
  if (!response.ok) return null

  const site = (await response.json()) as { html_url?: string; status?: string }
  return site.html_url ? { url: site.html_url, status: site.status || 'unknown' } : null
}
