const path = require('path');

const createRunner = require('./testup');
const TapReporter = require('./reporters/tap-reporter');

async function main(argv) {
  const [files, testArgv] = splitArgs(argv.slice(2));
  const file = files[0];

  if (! file) {
    console.error('Test file not specified');
    process.exit(1);
  }

  const cwd = process.cwd();
  const dir = path.dirname(path.relative(cwd, file));

  let lineLength = 80;
  if (process.stdout.isTTY) {
    lineLength = process.stdout.getWindowSize()[0];
  }

  const reporter = new TapReporter({
    dir,
    lineLength,
  });

  const testsuit = require(path.resolve(file));

  if (typeof testsuit !== 'function') {
    console.error('Test "' + file + '" exports no function');
    process.exit(1);
  }

  const runner = createRunner({
    reporter,
  });

  const section = await runner(testsuit(testArgv));

  return section.status === true ? 0 : 1;
}

function splitArgs(argv, splitter = '--') {
  const index = argv.indexOf(splitter);

  if (index < 0) {
    return [argv,[]];
  }

  return [argv.slice(0, index), argv.slice(index + 1)];
}

// Run application

main()
.catch(error => {
  // We never shout to get there!
  console.error(error);
  return 1;
})
.then((code = 0) => process.exit(code));
