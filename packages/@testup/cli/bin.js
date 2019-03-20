#!/usr/bin/env node

const coa = require('coa');

const cmd = coa.Cmd()
.name(process.argv[1])
.title('TestUp test running command line interface')
.helpful();

const commands = {
  run: './commands/run',
};

for (const [name, filepath] of Object.entries(commands)) {
  const fn = require(filepath);
  if (typeof fn !== 'function') {
    throw new Error(`Invalid command ${name}`);
  }

  fn(cmd.cmd().name(name));
}

cmd.run();
