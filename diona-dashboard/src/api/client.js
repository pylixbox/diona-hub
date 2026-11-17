const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    // TypeError on purpose: the login page uses it to tell "backend down" from "wrong password".
    throw new TypeError("Can't reach the DIONA hub. The backend may be down, or it hit an error - check its terminal.")
  }

  if (res.status === 401) {
    throw new Error('unauthenticated')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  getAlerts: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/api/alerts${qs ? `?${qs}` : ''}`)
  },
  getNodes: () => request('/api/nodes'),
  getStatsSummary: (days = 7) => request(`/api/stats/summary?days=${days}`),
  getTopSources: (days = 7) => request(`/api/stats/top-sources?days=${days}`),
  getSettings: () => request('/api/settings'),
  saveSettings: (payload) => request('/api/settings', { method: 'POST', body: JSON.stringify(payload) }),
  testTelegram: () => request('/api/settings/test-telegram', { method: 'POST' }),
}
