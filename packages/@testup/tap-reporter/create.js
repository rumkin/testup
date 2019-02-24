const TapReporter = require('./tap-reporter.js');

module.exports = function(opts, config) {
  let lineLength = 80;

  if (config.lineLength) {
    lineLength = config.lineLength;
  }
  else if (process.stdout.isTTY) {
    lineLength = process.stdout.getWindowSize()[0];
  }

  return new TapReporter({
    dir: opts.dir,
    lineLength,
    output: console.log,
  });
};
