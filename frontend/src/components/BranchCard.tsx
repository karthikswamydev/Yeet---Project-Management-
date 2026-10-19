import { Check, Copy, GitBranch, Terminal } from 'lucide-react'
import { useState } from 'react'
import { BRANCH_TYPES, branchName, suggestBranchType, type BranchType } from '../branch'
import { MenuSelect } from './MenuSelect'

export function BranchCard({ storyKey, title, labels }: { storyKey: string; title: string; labels: string[] }) {
  const [type, setType] = useState<BranchType>(() => suggestBranchType(labels))
  const [copied, setCopied] = useState<'name' | 'command' | null>(null)

  const name = branchName(type, storyKey, title)
  const command = `git checkout -b ${name}`

  async function copy(text: string, what: 'name' | 'command') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      window.setTimeout(() => setCopied((c) => (c === what ? null : c)), 1500)
    } catch {
      // Clipboard can be blocked (e.g. non-secure origin); the text is still selectable.
    }
  }

  return (
    <section className="details-card">
      <div className="details-head">
        <span className="dev-head">
          <GitBranch size={14} /> Development
        </span>
        <MenuSelect
          label="Branch type"
          value={type}
          onChange={setType}
          options={BRANCH_TYPES.map((t) => ({ value: t, node: <span className="mono">{t}/</span> }))}
        />
      </div>
      <div className="branch-body">
        <div className="branch-row">
          <code className="branch-name" title={name}>
            {name}
          </code>
          <button type="button" className="btn branch-copy" onClick={() => void copy(name, 'name')}>
            {copied === 'name' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'name' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="branch-row">
          <code className="branch-command" title={command}>
            <Terminal size={13} />
            {command}
          </code>
          <button type="button" className="btn branch-copy" onClick={() => void copy(command, 'command')}>
            {copied === 'command' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'command' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </section>
  )
}
