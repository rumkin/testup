const fs = require('fs')
const path = require('path')
const {promisify} = require('util')

const CmdError = require('../error')

const fsReadFile = promisify(fs.readFile)
const fsExists = promisify(fs.exists)

const OK = 0
const FAIL = 1

async function loadJson(filepath) {

  const content = await fsReadFile(filepath, 'utf8')

  try {
    return JSON.parse(content)
  }
  catch (err) {
    throw new Error('Invalid JSON')
  }
}

async function loadReporter(name, opts, config) {
  let search
  if (/^(\.{0,2})\//.test(name)) {
    search = [
      `${name}/create.js`,
      `${name}/create.mjs`,
    ]
  }
  else if (name) {
    search = [
      `node_modules/@testup/${name}-reporter/create.js`,
      `node_modules/@testup/${name}-reporter/create.mjs`,
    ]
  }
  else {
    search = [
      'node_modules/@testup/console-reporter/create.js',
      'node_modules/@testup/console-reporter/create.mjs',
      'node_modules/@testup/tap-reporter/create.js',
      'node_modules/@testup/tap-reporter/create.mjs',
    ]
  }

  const reporterModule = await lookup(opts.dir, search)

  if (reporterModule === null) {
    throw new Error('Reporter module not specified and not found')
  }

  const createReporter = require(reporterModule)

  return createReporter(opts, config.reporter || {})
}

async function lookup(dir, files) {
  const parts = dir.split(path.SEP)
  if (! Array.isArray(files)) {
    files = [files]
  }

  while (parts.length) {
    for (const file of files) {
      const filepath = path.join(...parts, file)
      if (await fsExists(filepath)) {
        return filepath
      }
    }
    parts.pop()
  }
}

async function testAction(opts) {
  let testup

  if (opts.package) {
    testup = await path.resolve(opts.dir, opts.package)

    if (! await fsExists(testup)) {
      throw new CmdError(`TestUp Core package not found at "${opts.package}"`)
    }
  }
  else {
    testup = await lookup(
      opts.dir,
      path.join('node_modules', '@testup', 'core'),
    )

    if (! testup) {
      throw new CmdError('TestUp Core package not found')
    }
  }

  const {
    runScript,
    Suite,
  } = require(testup)

  const {dir, files} = opts

  let config = {}
  if (opts.config) {
    if (! await fsExists(opts.config)) {
      throw new CmdError(`Config file "${opts.config}" not found`)
    }
    config = await loadJson(opts.config)
  }
  else {
    const configPath = path.resolve(dir, '.testuprc')
    if (await fsExists(configPath)) {
      config = await loadJson(configPath)
    }
  }

  const suites = []

  for (const file of files) {
    const reporter = await loadReporter(
      opts.reporter || config.reporter,
      opts,
      config,
    )

    const suite = new Suite({
      label: `File: ${file}`,
    })
    suites.push(suite)

    if (! file) {
      throw new CmdError('Test file not specified')
    }
    else if (! await fsExists(file)) {
      throw new CmdError('Test file not found')
    }

    let script = require(path.resolve(file))

    if (typeof script === 'object' && typeof script.default === 'function') {
      script = script.default
    }

    if (typeof script !== 'function') {
      throw new CmdError(`Test "${file}" exports no function`)
    }

    await runScript({
      script,
      reporter,
      suite,
      reportErrors: true,
    })
  }

  return suites.some((suite) => !suite.isOk) ? FAIL : OK
}

module.exports = testAction
