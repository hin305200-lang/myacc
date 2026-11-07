#!/usr/bin/env node
/**
 * Smoke-test Supabase using the publishable key only (never service_role).
 * Usage: node scripts/test-supabase-connection.mjs
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_* equivalents)')
  process.exit(1)
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Accept: 'application/json',
}

const authRes = await fetch(`${url}/auth/v1/settings`, { headers })
const authOk = authRes.ok
console.log(`Auth settings: ${authRes.status} ${authOk ? 'OK' : 'FAIL'}`)

const restRes = await fetch(`${url}/rest/v1/User?select=id&limit=1`, { headers })
const restBody = await restRes.text()
console.log(`REST User: ${restRes.status} ${restRes.ok ? 'OK' : 'FAIL'} body=${restBody.slice(0, 120)}`)

if (!authOk) process.exit(1)
console.log('Supabase publishable-key connection looks good.')
console.log('Note: app data access still goes through the Fastify API + Prisma (DATABASE_URL).')
