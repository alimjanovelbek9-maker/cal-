import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[v0] App render error', error, info) }
  render() {
    if (this.state.error) return <pre style={{ padding: 24, whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
    return this.props.children
  }
}
import { createRoot } from 'react-dom/client'
import App from './App'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
