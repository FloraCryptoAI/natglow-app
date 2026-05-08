// Vercel Cron Job — runs daily at 10:00 UTC
// Calls the Supabase auto-notifications edge function
export default async function handler(req, res) {
  // Vercel sends Authorization: Bearer <CRON_SECRET> for cron invocations
  const authHeader = req.headers.authorization ?? ''
  const cronSecret = process.env.CRON_SECRET ?? ''

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const anonKey    = process.env.VITE_SUPABASE_ANON_KEY

    const response = await fetch(`${supabaseUrl}/functions/v1/auto-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey:          anonKey,
        'x-cron-secret': cronSecret,
      },
    })

    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message ?? 'Internal error' })
  }
}
