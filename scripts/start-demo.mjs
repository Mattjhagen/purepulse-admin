import fs from 'node:fs'
import { spawn } from 'node:child_process'

const env = { ...process.env }
for (const line of fs.readFileSync(process.env.PUREPULSE_ENV_FILE || '.env.production', 'utf8').split(/\r?\n/)) {
  const index = line.indexOf('=')
  if (index > 0) env[line.slice(0, index)] = line.slice(index + 1)
}
const child = spawn('/usr/bin/npm', ['run', 'start', '--', '-H', '127.0.0.1', '-p', '3041'], { env, stdio: 'inherit' })
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 1)))
