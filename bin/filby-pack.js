#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');

const { pack } = require('../lib/pack');

const USAGE = 'Usage: filby-pack --bundle <file> --name <package> --out <directory>';
const OPTIONS = ['bundle', 'name', 'out'];

class UsageError extends Error {}

function main() {
  try {
    const { bundle: bundleFile, name, out } = readOptions(process.argv.slice(2));
    const { version } = pack(readBundle(bundleFile), { name, out: path.resolve(out) });
    process.stdout.write(`${name}@${version}\n`);
  } catch (err) {
    process.stderr.write(err instanceof UsageError ? `${err.message}\n${USAGE}\n` : `${err.message}\n`);
    process.exitCode = 1;
  }
}

function readOptions(args) {
  let values;
  try {
    ({ values } = parseArgs({ args, options: Object.fromEntries(OPTIONS.map((name) => [name, { type: 'string' }])) }));
  } catch (err) {
    throw new UsageError(err.message);
  }
  const missing = OPTIONS.find((name) => values[name] === undefined);
  if (missing) throw new UsageError(`Missing option '--${missing}'`);
  return values;
}

function readBundle(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`Cannot read bundle '${file}': ${err.message}`);
  }
}

main();
