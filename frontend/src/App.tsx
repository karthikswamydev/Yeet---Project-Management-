import { useCallback, useEffect, useRef, useState } from 'react'
import { api, AUTH_REQUIRED_EVENT, AuthError, DEV_USER_KEY, type Me, type Project } from './api'
import { AuthContext, type AuthState } from './auth'
import { ConfirmHost } from './components/ConfirmHost'
import { CreateProjectModal } from './components/CreateProjectModal'
import { Dashboard } from './components/Dashboard'
import { MyWorkPage } from './components/MyWorkPage'
import { ProjectPage } from './components/ProjectPage'
import { Sidebar } from './components/Sidebar'
import { AccountPage } from './components/AccountPage'
import { PeoplePage } from './components/PeoplePage'
import { SignIn } from './components/SignIn'
import { Toaster } from './components/Toaster'
import { Topbar } from './components/Topbar'
import { projectHref, storyHref, useRoute } from './routes'

function App() {
  const [me, setMe] = useState<Me | null>(null)
  const [mode, setMode] = useState<AuthState['mode']>('dev')
  const [needsSignIn, setNeedsSignIn] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const route = useRoute()
  const refreshMeRef = useRef<() => void>(() => {})

  const refreshProjects = useCallback(() => {
    api.listProjects().then(setProjects).catch(() => setProjects([]))
  }, [])

  useEffect(() => {
    api
      .authConfig()
      .then((c) => setMode(c.mode))
      .catch(() => {})
    refreshMeRef.current = () => void api.me().then(setMe).catch(() => {})
    api
      .me()
      .then((m) => {
        setMe(m)
        refreshProjects()
      })
      .catch((e: unknown) => {
        if (!(e instanceof AuthError)) return
        // A dev "view as" person who no longer exists: fall back to the default user.
        try {
          if (localStorage.getItem(DEV_USER_KEY)) {
            localStorage.removeItem(DEV_USER_KEY)
            window.location.reload()
            return
          }
        } catch {
          // ignore
        }
        setNeedsSignIn(true)
      })
  }, [refreshProjects])

  // Any 401 after load (e.g. the Stytch session expired) brings back the sign-in screen.
  useEffect(() => {
    if (mode !== 'stytch') return
    const onAuthRequired = () => setNeedsSignIn(true)
    window.addEventListener(AUTH_REQUIRED_EVENT, onAuthRequired)
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, onAuthRequired)
  }, [mode])

  const name = me?.name ?? 'there'

  if (needsSignIn) return <SignIn />

  return (
    <AuthContext.Provider value={{ me, mode, refreshMe: () => refreshMeRef.current() }}>
    <div className="app">
      <Sidebar
        orgName={me?.org_name ?? 'Workspace'}
        projects={projects}
        route={route}
        onCreateProject={() => setShowCreate(true)}
      />
      <div className="main">
        <Topbar onCreateProject={() => setShowCreate(true)} />
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
          {route.page === 'people' && <PeoplePage />}
          {/* Keyed so the form starts from the loaded (or freshly saved) name. */}
          {route.page === 'account' && me && <AccountPage key={`${me.id}:${me.name}`} projects={projects} />}
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
    </AuthContext.Provider>
  )
}

export default App
