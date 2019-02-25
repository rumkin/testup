const fs = require('fs');
const path = require('path');
const {promisify} = require('util');

const CmdError = require('../error');

const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);

const OK = 0;
const FAIL = 1;

async function loadJson(filepath) {

  const content = await readFile(filepath, 'utf8');

  try {
    return JSON.parse(content);
  }
  catch (err) {
    throw new Error('Invalid JSON');
  }
}

async function loadReporter(name, opts, config) {
  let reporterModule;
  if (/^(\.{0,2})\//.test(name)) {
    reporterModule = path.resolve(`${name}/create`);
  }
  else {
    reporterModule = `@testup/${name}-reporter/create`;
  }

  const createReporter = require(reporterModule);

  return createReporter(opts, config.reporter || {});
}

async function lookup(dir, files) {
  const parts = dir.split(path.SEP);
  if (! Array.isArray(files)) {
    files = [files];
  }

  while (parts.length) {
    for (const file of files) {
      const filepath = path.join(...parts, file);
      if (await exists(filepath)) {
        return filepath;
      }
    }
    parts.pop();
  }
}

async function testAction(opts) {
  let testup;

  if (opts.package) {
    testup = path.resolve(opts.package);

    if (! await exists(testup)) {
      throw new CmdError(`TestUp Core package not found at "${testup}"`);
    }
  }
  else {
    testup = await lookup(
      opts.dir,
      path.join('node_modules', '@testup', 'core'),
    );

    if (! testup) {
      throw new CmdError('TestUp Core package not found');
    }
  }

  const {
    runScript,
    Suite,
  } = require(testup);

  const {dir, files} = opts;

  let config = {};
  if (opts.config) {
    if (! await exists(opts.config)) {
      throw new CmdError(`Config file "${opts.config}" not found`);
    }
    config = await loadJson(opts.config);
  }
  else {
    const configPath = path.resolve(dir, '.testuprc');
    if (await exists(configPath)) {
      config = await loadJson(configPath);
    }
  }

  const reporter = await loadReporter(
    opts.reporter || config.reporter,
    opts,
    config,
  );

  const suite = new Suite();

  for (const file of files) {
    if (! file) {
      throw new CmdError('Test file not specified');
    }
    else if (! await exists(file)) {
      throw new CmdError('Test file not found');
    }

    const script = require(path.resolve(file));

    if (typeof script !== 'function') {
      throw CmdError(`Test "${file}" exports no function`);
    }

    await runScript({
      script,
      reporter,
      suite,
      reportErrors: true,
    });
  }

  return suite.isOk ? OK : FAIL;
}

module.exports = testAction;
