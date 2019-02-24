const CmdError = require('./error');
function command (fn) {
  const DEBUG = process.env.DEBUG === '1';

  return async function(...args) {
    try {
      const exitCode = await fn(...args);
      process.exit(exitCode || 0);
    }
    catch (err) {
      if (! (err instanceof CmdError) || DEBUG) {
        throw err;
      }
      else {
        throw err.message;
      }
    }
  };
}

module.exports = command;
