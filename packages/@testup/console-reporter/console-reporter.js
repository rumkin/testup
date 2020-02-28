class ConsoleReporter {
  constructor({
    indent = '  ',
    initialIndent = '',
    startDepth = 0,
    successMark = '✓',
    failureMark = '✖',
  } = {}) {
    this.indent = indent
    this.initialIndent = initialIndent
    this.startDepth = startDepth
    this.successMark = successMark
    this.failureMark = failureMark
    this.failedCases = []
  }

  startSuite(unit) {
    if (unit.depth < this.startDepth) {
      return
    }

    const indent = this.initialIndent + this.indent.repeat(
      unit.depth - this.startDepth
    )

    console.log('%s%s %s', indent, '§', unit.label)
  }

  endSuite({isRoot}) {
    if (! isRoot) {
      return
    }

    this.failedCases.forEach((unit, i) => {
      const parents = unit.parents.slice(0, -1)
      .map(({label}) => label)
      .join(' < ')

      console.log('')
      console.log('%s) %s < %s', i + 1, unit.label, parents)
      console.log('%s', this.errorToString(unit.error))
    })
  }

  errorToString(err) {
    const prefix = err.name + ': ' + err.message
    if (err.stack.startsWith(prefix)) {
      return err.message + '\n' + err.stack.slice(prefix.length + 1)
    }
    else {
      return err.message + '\n' + err.stack
    }
  }

  startCase() {}

  endCase(unit) {
    const indent = this.indent.repeat(unit.depth - 1)
    const mark = unit.isOk ? this.successMark : this.failureMark
    if (! unit.isOk) {
      this.failedCases.push(unit)
    }
    console.log('%s%s %s', indent, mark, unit.label)
  }

  reportBrokenUnit(unit, error) {
    console.error('Invalid unit %s:', unit.label, error)
  }

  reportBrokenScript(error) {
    console.error('Invalid test script:', error)
  }

  reportError(error) {
    console.error('Unknown error:', error)
  }
}

module.exports = ConsoleReporter
