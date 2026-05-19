async function getGraphAccessToken() {
  const url = `https://login.microsoftonline.com/${process.env.GRAPH_TENANT_ID}/oauth2/v2.0/token`
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.GRAPH_CLIENT_ID,
    client_secret: process.env.GRAPH_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
  })
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`Graph token error: ${json.error_description ?? res.status}`)
  return json.access_token
}

function sanitizeName(str) {
  return (str ?? 'Unknown').replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function buildDrivePath(clientName, date, filename) {
  const year = date.slice(0, 4)
  const safeClient = sanitizeName(clientName)
  return `Business Solutions/${safeClient}/${year}/${filename}`
}

export async function uploadToSharePoint({ buffer, filename, clientName, date }) {
  const token = await getGraphAccessToken()
  const drivePath = buildDrivePath(clientName, date, filename)
  const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${process.env.SHAREPOINT_SITE_ID}/drives/${process.env.SHAREPOINT_DRIVE_ID}/root:/${drivePath}:/content`

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/pdf',
    },
    body: buffer,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`SharePoint upload error: ${json.error?.message ?? res.status}`)
  return json.webUrl
}
