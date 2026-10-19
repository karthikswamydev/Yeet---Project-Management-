export const BRANCH_TYPES = ['feature', 'bugfix', 'hotfix', 'chore'] as const
export type BranchType = (typeof BRANCH_TYPES)[number]

const MAX_SLUG = 50

/** "Protected Route: Auth & Middleware!" -> "protected-route-auth-middleware" (cut at a word boundary). */
export function slugify(text: string) {
  const slug = text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug.length <= MAX_SLUG) return slug
  const cut = slug.slice(0, MAX_SLUG)
  return cut.includes('-') ? cut.slice(0, cut.lastIndexOf('-')) : cut
}

/** Jira-style branch name: keeps the issue key so tools can link the branch back to the story. */
export function branchName(type: BranchType, key: string, title: string) {
  const slug = slugify(title)
  return `${type}/${key}${slug ? `-${slug}` : ''}`
}

/** Labels like "Bug" suggest a bugfix branch; everything else defaults to feature. */
export function suggestBranchType(labels: string[]): BranchType {
  const lower = labels.map((l) => l.toLowerCase())
  if (lower.some((l) => l.includes('hotfix'))) return 'hotfix'
  if (lower.some((l) => l.includes('bug') || l.includes('fix'))) return 'bugfix'
  if (lower.some((l) => l.includes('chore') || l.includes('tech debt'))) return 'chore'
  return 'feature'
}
