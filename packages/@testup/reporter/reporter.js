class BaseReporter {
  startSuite() {}
  endSuite() {}
  startCase() {}
  endCase() {}
  reportError() {}
  reportBrokenUnit() {}
  reportBrokenScript() {}
}

module.exports = BaseReporter;
