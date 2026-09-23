import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const demoData = readFileSync(new URL('../lib/northstar/demo-data.ts', import.meta.url), 'utf8')

test('the public release exposes the expected quality commands', () => {
  for (const command of ['lint', 'typecheck', 'test', 'build', 'check']) {
    assert.equal(typeof packageJson.scripts[command], 'string')
  }
})

test('the demo dataset is explicit and includes several fictional personas', () => {
  assert.match(demoData, /NORTHSTAR_ORG/)
  assert.match(demoData, /\.example'/)
  assert.ok((demoData.match(/memberId:/g) ?? []).length >= 5)
})
