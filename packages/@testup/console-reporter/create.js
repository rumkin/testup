const Reporter = require('./console-reporter')

module.exports = function(opts, {
  indent,
  successMark,
  failureMark,
} = {}) {
  return new Reporter({
    indent,
    successMark,
    failureMark,
  })
}
