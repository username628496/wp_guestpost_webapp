# Frontend State Management Improvements

## Overview

Improved frontend architecture with centralized state management using React Context API and custom hooks.

## Key Improvements

### 1. Centralized State Management

**AppContext** (`src/contexts/AppContext.jsx`)
- Global application state
- Authentication management
- WordPress sites management
- App settings persistence

### 2. Custom Hooks

**useApp** - Access global app state
```jsx
import { useApp } from '../contexts/AppContext'

function MyComponent() {
  const { isAuthenticated, user, activeSite } = useApp()
  // ...
}
```

**useEditorSession** - Editor session management
```jsx
import { useEditorSession } from '../hooks/useEditorSession'

function EditorComponent() {
  const {
    session,
    loading,
    createSession,
    loadSession,
    updatePost,
    saveSnapshot
  } = useEditorSession()

  // Create session
  await createSession(wpSiteId, domain, posts)

  // Load session
  await loadSession(sessionId)

  // Update post
  await updatePost(sessionId, postId, 'title', 'New Title')

  // Save snapshot
  await saveSnapshot(sessionId, 'My Snapshot')
}
```

**useAsync** - Generic async operations
```jsx
import { useAsync, useAsyncRetry } from '../hooks/useAsync'

function MyComponent() {
  const { execute, status, value, error } = useAsync(fetchData)

  // With retry logic
  const { execute, retryCount, canRetry } = useAsyncRetry(
    fetchData,
    { maxRetries: 3, retryDelay: 1000 }
  )
}
```

## Usage Guide

### Setup AppContext

Wrap your app with `AppProvider`:

```jsx
// main.jsx
import { AppProvider } from './contexts/AppContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppProvider>
    <App />
  </AppProvider>
)
```

### Authentication Flow

```jsx
import { useApp } from '../contexts/AppContext'

function LoginPage() {
  const { login, isAuthenticated } = useApp()

  const handleLogin = async (username, password) => {
    const result = await login(username, password)
    if (result.success) {
      navigate('/dashboard')
    }
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />
  }

  return <LoginForm onSubmit={handleLogin} />
}
```

### WordPress Sites Management

```jsx
import { useApp } from '../contexts/AppContext'

function SitesPage() {
  const {
    wpSites,
    activeSite,
    loadingSites,
    setActiveWpSite,
    addWpSite,
    updateWpSite,
    deleteWpSite
  } = useApp()

  return (
    <div>
      {wpSites.map(site => (
        <SiteCard
          key={site.id}
          site={site}
          isActive={activeSite?.id === site.id}
          onSetActive={() => setActiveWpSite(site.id)}
          onDelete={() => deleteWpSite(site.id)}
        />
      ))}
    </div>
  )
}
```

### Editor Session Workflow

```jsx
import { useApp } from '../contexts/AppContext'
import { useEditorSession } from '../hooks/useEditorSession'

function EditorPage() {
  const { activeSite } = useApp()
  const {
    session,
    loading,
    createSession,
    updatePost,
    saveSnapshot
  } = useEditorSession()

  const handleStartEditing = async (posts) => {
    const result = await createSession(
      activeSite.id,
      activeSite.domain,
      posts
    )
    if (result.success) {
      // Session created, start editing
    }
  }

  const handleSave = async () => {
    const result = await saveSnapshot(
      session.session_id,
      'Auto Save ' + new Date().toISOString()
    )
  }

  return (
    <div>
      {loading && <Spinner />}
      {session && <Editor session={session} onUpdate={updatePost} />}
    </div>
  )
}
```

## Benefits

### Before (Component-level state)
```jsx
function Component() {
  const [user, setUser] = useState(null)
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch user
    // Fetch sites
    // Handle loading
  }, [])

  // Props drilling to children...
}
```

### After (Context + Hooks)
```jsx
function Component() {
  const { user, wpSites, loadingSites } = useApp()
  // Clean, no prop drilling needed!
}
```

## State Structure

```javascript
AppContext:
  ├── Authentication
  │   ├── isAuthenticated: boolean
  │   ├── user: { username, role }
  │   ├── authToken: string
  │   ├── login(username, password)
  │   └── logout()
  │
  ├── WordPress Sites
  │   ├── wpSites: Site[]
  │   ├── activeSite: Site
  │   ├── loadingSites: boolean
  │   ├── loadWpSites()
  │   ├── setActiveWpSite(id)
  │   ├── addWpSite(data)
  │   ├── updateWpSite(id, data)
  │   └── deleteWpSite(id)
  │
  └── App Settings
      ├── theme: 'light' | 'dark'
      ├── autoSave: boolean
      ├── autoRefreshInterval: number
      └── updateSettings(settings)
```

## Migration Guide

### Step 1: Wrap App with Provider

```jsx
// main.jsx
import { AppProvider } from './contexts/AppContext'

<AppProvider>
  <App />
</AppProvider>
```

### Step 2: Replace Component State

**Before:**
```jsx
const [user, setUser] = useState(null)
const [isLoggedIn, setIsLoggedIn] = useState(false)
```

**After:**
```jsx
const { user, isAuthenticated } = useApp()
```

### Step 3: Replace API Calls

**Before:**
```jsx
const handleLogin = async () => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
  const data = await res.json()
  if (data.success) {
    localStorage.setItem('token', data.token)
    setUser(data.user)
  }
}
```

**After:**
```jsx
const { login } = useApp()

const handleLogin = async () => {
  const result = await login(username, password)
  if (result.success) {
    // Navigate or show success
  }
}
```

### Step 4: Remove Prop Drilling

**Before:**
```jsx
<Parent>
  <Child user={user} onLogout={handleLogout} />
    <GrandChild user={user} onLogout={handleLogout} />
      <GreatGrandChild user={user} onLogout={handleLogout} />
</Parent>
```

**After:**
```jsx
<Parent>
  <Child />
    <GrandChild />
      <GreatGrandChild />  // Uses useApp() directly
</Parent>
```

## Error Handling

All hooks include built-in error handling with toast notifications:

```jsx
const { createSession } = useEditorSession()

const result = await createSession(wpSiteId, domain, posts)

if (result.success) {
  // Success toast shown automatically
} else {
  // Error toast shown automatically
  console.error(result.error)
}
```

## Performance Considerations

1. **Context Splitting**: AppContext only re-renders when relevant state changes
2. **Memoization**: Use `useMemo` for expensive computations
3. **Lazy Loading**: Load data only when needed
4. **Cleanup**: All hooks handle component unmount cleanup

## Best Practices

### 1. Use Context for Global State Only
- Authentication
- User preferences
- App-wide settings
- Shared resources (WordPress sites)

### 2. Use Local State for Component-Specific Data
- Form inputs
- UI toggles
- Temporary data

### 3. Use Custom Hooks for Reusable Logic
- API calls
- Data fetching
- Complex state logic

### 4. Always Handle Loading States
```jsx
const { loading, error, execute } = useAsync(fetchData)

if (loading) return <Spinner />
if (error) return <Error message={error.message} />
```

## Testing

```jsx
import { render } from '@testing-library/react'
import { AppProvider } from '../contexts/AppContext'

test('component with context', () => {
  render(
    <AppProvider>
      <MyComponent />
    </AppProvider>
  )
  // Test assertions...
})
```

## Future Improvements

- [ ] Add React Query for server state management
- [ ] Implement optimistic updates
- [ ] Add offline support with service workers
- [ ] Implement undo/redo functionality
- [ ] Add state persistence/hydration
