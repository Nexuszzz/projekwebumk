/**
 * prisma generate aman di Vercel tanpa DATABASE_URL asli.
 * Runtime tetap file-JSON kecuali DATABASE_URL postgres real di-set.
 */
const { execSync } = require('child_process')

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://build:build@127.0.0.1:5432/build'
}

execSync('npx prisma generate', {
  stdio: 'inherit',
  env: process.env,
})
