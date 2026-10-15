#!/usr/bin/env node
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCli } from '../cli/main.mjs'
try {
  const code = await runCli({ root: resolve(dirname(fileURLToPath(import.meta.url)), '..'), args: process.argv.slice(2), cwd: process.cwd() })
  process.exitCode = code || 0
} catch (error) {
  console.error('dsh-wb-cli: ' + error.message)
  process.exitCode = 1
}
