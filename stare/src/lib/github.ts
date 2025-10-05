import { getSettings } from '@/stores/settings'

export async function githubUpsertFiles(files: { path: string; content: string }[]) {
  const s = getSettings()
  const sessionToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('student-asystent:gh-token') : null
  const token = (sessionToken || s.githubToken) as string
  if (!token || !s.githubRepo) throw new Error('Brak konfiguracji GitHub (token lub repo)')
  const [owner, repo] = (s.githubRepo as string).split('/')
  const branch = (s.githubBranch ?? 'main') as string
  const apiBase = 'https://api.github.com'

  // Get branch ref
  const ref = await gh(`${apiBase}/repos/${owner}/${repo}/git/refs/heads/${branch}`, token)
  const baseSha = ref.object.sha

  // Create blobs
  const blobs = await Promise.all(files.map(f => gh(`${apiBase}/repos/${owner}/${repo}/git/blobs`, token, {
    content: f.content,
    encoding: 'utf-8'
  })))

  // Get base tree
  const baseCommit = await gh(`${apiBase}/repos/${owner}/${repo}/git/commits/${baseSha}`, token)

  // Create tree
  const tree = files.map((f, i) => ({ path: f.path, mode: '100644', type: 'blob', sha: blobs[i].sha }))
  const newTree = await gh(`${apiBase}/repos/${owner}/${repo}/git/trees`, token, {
    base_tree: baseCommit.tree.sha,
    tree
  })

  // Create commit
  const commit = await gh(`${apiBase}/repos/${owner}/${repo}/git/commits`, token, {
    message: 'sync: student-asystent export',
    tree: newTree.sha,
    parents: [baseSha]
  })

  // Update ref
  await gh(`${apiBase}/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
    sha: commit.sha,
    force: true
  }, 'PATCH')
}

async function gh(url: string, token: string, body?: any, method: 'GET'|'POST'|'PATCH' = body? 'POST':'GET') {
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}
