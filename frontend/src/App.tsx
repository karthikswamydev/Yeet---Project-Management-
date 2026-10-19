import { useCallback, useEffect, useState } from 'react'
import { api, type Project } from './api'
import { activity, tasks } from './data'
import { ActivityFeed } from './components/ActivityFeed'
import { BoardPreview } from './components/BoardPreview'
import { CreateProjectModal } from './components/CreateProjectModal'
import { MyWork } from './components/MyWork'
import { ProjectCards } from './components/ProjectCards'
import { ProjectPage } from './components/ProjectPage'
import { Sidebar } from './components/Sidebar'
import { StatCards } from './components/StatCards'
import { Topbar } from './components/Topbar'

type Me = { id: string; email: string; name: string; org_id: string; role: string }

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// Minimal hash routing: "#/" is the dashboard, "#/projects/:id" a project.
function useProjectIdFromHash() {
  const read = () => /^#\/projects\/([^/]+)/.exec(window.location.hash)?.[1] ?? null
  const [id, setId] = useState(read)
  useEffect(() => {
    const onChange = () => setId(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return id
}

function App() {
  const [me, setMe] = useState<Me | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const projectId = useProjectIdFromHash()

  const refreshProjects = useCallback(() => {
    api.listProjects().then(setProjects).catch(() => setProjects([]))
  }, [])

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json() as Promise<Me>)
      .then(setMe)
      .catch(() => setMe(null))
    refreshProjects()
  }, [refreshProjects])

  const name = me?.name ?? 'there'
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="app">
      <Sidebar
        orgName={me ? 'Test Org' : 'Workspace'}
        projects={projects}
        activeProjectId={projectId}
        onCreateProject={() => setShowCreate(true)}
      />
      <div className="main">
        <Topbar userName={name} onCreateProject={() => setShowCreate(true)} />
        <main className="content">
          {projectId ? (
            <ProjectPage
              key={projectId}
              projectId={projectId}
              currentUserId={me?.id ?? null}
              onChanged={refreshProjects}
            />
          ) : (
            <>
              <div className="page-head">
                <h1>
                  {greeting()}, {name.split(' ')[0]}
                </h1>
                <p className="subtitle">{today}</p>
              </div>

              <StatCards tasks={tasks} />

              <div className="two-col">
                <MyWork tasks={tasks} />
                <ActivityFeed items={activity} />
              </div>

              <ProjectCards projects={projects} onCreate={() => setShowCreate(true)} />
              <BoardPreview tasks={tasks} />
            </>
          )}
        </main>
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => {
            setShowCreate(false)
            refreshProjects()
            window.location.hash = `#/projects/${p.id}`
          }}
        />
      )}
    </div>
  )
}

export default App
