const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

export async function fetchTotalRevenueCents(): Promise<number> {
  let total = 0
  let startingAfter = ''
  for (let page = 0; page < 10; page++) {
    const q = new URLSearchParams({ limit: '100', status: 'paid' })
    if (startingAfter) q.set('starting_after', startingAfter)
    const res = await fetch(`https://api.stripe.com/v1/invoices?${q}`, {
      headers: { Authorization: `Bearer ${STRIPE_KEY}` },
    })
    const data = await res.json()
    for (const inv of data.data ?? []) total += Number(inv.amount_paid ?? 0)
    if (!data.has_more || !data.data?.length) break
    startingAfter = data.data[data.data.length - 1].id
  }
  return total
}
