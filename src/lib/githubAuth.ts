// Minimal GitHub OAuth Device Flow helper
// Requires a GitHub OAuth App (Device Flow enabled). Provide clientId via env or Settings.

export async function githubDeviceCode(clientId: string, scope = 'repo') {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, scope })
  })
  if (!res.ok) throw new Error('Device code request failed')
  return res.json() as Promise<{ device_code: string; user_code: string; verification_uri: string; expires_in: number; interval: number }>
}

export async function githubPollToken(clientId: string, deviceCode: string, interval = 5) {
  while (true) {
    await new Promise(r => setTimeout(r, interval * 1000))
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, device_code: deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
    })
    if (!res.ok) throw new Error('Token polling failed')
    const data = await res.json()
    if (data.error === 'authorization_pending') continue
    if (data.error) throw new Error(data.error_description || data.error)
    return data.access_token as string
  }
}
