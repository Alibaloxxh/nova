import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  const { orderId, status } = await req.json()
  if (!orderId || !status) return new Response('missing orderId/status', { status: 400 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single()
  if (error || !order) return new Response('order not found', { status: 404 })

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.warn('RESEND_API_KEY not set; skipping email')
    return new Response('ok (no email configured)', { status: 200 })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_FROM') ?? 'Nova Store <onboarding@resend.dev>',
      to: order.email,
      subject: `Your Nova order #${orderId.slice(0, 8)} is now ${status}`,
      text: `Hi ${order.customer_name},\n\nYour order #${orderId.slice(0, 8)} is now: ${status}.\n\nTotal: $${order.total}\nPayment: ${order.payment_method}\n\nThank you,\nNova`,
    }),
  })
  if (!res.ok) console.error('resend error', res.status, await res.text())

  return new Response('ok', { status: 200 })
})