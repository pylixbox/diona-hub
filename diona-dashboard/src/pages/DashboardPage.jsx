import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import OverviewView from './OverviewView'
import NodesView from './NodesView'
import ThreatsView from './ThreatsView'
import AlertsView from './AlertsView'
import SettingsPage from './SettingsPage'

const VIEWS = {
  overview: OverviewView,
  nodes: NodesView,
  trends: ThreatsView,
  alerts: AlertsView,
  settings: SettingsPage,
}

// The current page lives in the URL hash (#/alerts), so refresh and the
// browser back button keep working without a router library.
function fromHash() {
  const key = window.location.hash.replace('#/', '')
  return key in VIEWS ? key : 'overview'
}

export default function DashboardPage() {
  const [view, setView] = useState(fromHash)

  useEffect(() => {
    const onHash = () => setView(fromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navigate = (key) => {
    window.location.hash = `#/${key}`
    window.scrollTo({ top: 0 })
  }

  const View = VIEWS[view]
  return (
    <Layout view={view} onNavigate={navigate}>
      <View onNavigate={navigate} />
    </Layout>
  )
}
