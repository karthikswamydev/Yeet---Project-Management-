import { useCallback, useEffect, useState } from 'react'
import { api, type Me, type Project } from './api'
import { ConfirmHost } from './components/ConfirmHost'
import { CreateProjectModal } from './components/CreateProjectModal'
import { Dashboard } from './components/Dashboard'
import { MyWorkPage } from './components/MyWorkPage'
import { ProjectPage } from './components/ProjectPage'
import { Sidebar } from './components/Sidebar'
import { Toaster } from './components/Toaster'
import { Topbar } from './components/Topbar'
import { projectHref, storyHref, useRoute } from './routes'

function App() {
  const [me, setMe] = useState<Me | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const route = useRoute()

  const refreshProjects = useCallback(() => {
    api.listProjects().then(setProjects).catch(() => setProjects([]))
  }, [])

  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch(() => setMe(null))
    refreshProjects()
  }, [refreshProjects])

  const name = me?.name ?? 'there'

  return (
    <div className="app">
      <Sidebar
        orgName={me ? 'Test Org' : 'Workspace'}
        projects={projects}
        route={route}
        onCreateProject={() => setShowCreate(true)}
      />
      <div className="main">
        <Topbar userName={name} onCreateProject={() => setShowCreate(true)} />
        <main className="content">
          {route.page === 'project' && (
            <ProjectPage
              key={route.projectId}
              projectId={route.projectId}
              storyId={route.storyId}
              tab={route.tab}
              onSelectStory={(id) => {
                window.location.hash = id ? storyHref(route.projectId, id) : projectHref(route.projectId)
              }}
              currentUserId={me?.id ?? null}
              onChanged={refreshProjects}
            />
          )}
          {route.page === 'my-work' && <MyWorkPage currentUserId={me?.id ?? null} projects={projects} />}
          {route.page === 'home' && (
            <Dashboard
              userName={name}
              currentUserId={me?.id ?? null}
              projects={projects}
              onCreateProject={() => setShowCreate(true)}
            />
          )}
        </main>
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => {
            setShowCreate(false)
            refreshProjects()
            window.location.hash = projectHref(p.id)
          }}
        />
      )}

      <ConfirmHost />
      <Toaster />
    </div>
  )
}

export default App
