const assert = require('assert');

const {
  runScript,
} = require('./');

// Util fnctions

function testScript(...args) {
  let script;
  let context;
  if (args.length > 1) {
    context = args[0];
    script = args[1];
  }
  else {
    script = args[0];
    context = {};
  }
  const reporter = {
    unitErrors: [],
    scriptErrors: [],
    errors: [],
    startSuite() {},
    endSuite() {},
    startCase() {},
    endCase() {},
    reportBrokenUnit(unit, error) {
      this.unitErrors.push(error);
    },
    reportBrokenScript(error) {
      this.scriptErrors.push(error);
    },
    reportError(error) {
      this.errors.push(error);
    },
  };

  return runScript({
    script,
    reporter,
    context,
  })
  .then((suite) => ({suite, reporter}));
}

function pipe(value, ...tests) {
  for (const test of tests) {
    test(value);
  }
}

function shouldBeCompleted({suite}) {
  assert.ok(suite.isCompleted, 'Should be completed');
}

function shouldBeNotCompleted({suite}) {
  assert.ok(! suite.isCompleted, 'Should be not completed');
}

function shouldBeOk({suite}) {
  assert.ok(suite.isOk, 'Suite should be ok');
}

function shouldBeNotOk({suite}) {
  assert.ok(! suite.isOk, 'Suite should be not ok');
}

function testsTotal(total) {
  return function({suite}) {
    assert.equal(suite.total, total, 'Tests total');
  };
}

function testsPassed(passed) {
  return function({suite}) {
    assert.equal(suite.passed, passed, 'Tests passed');
  };
}

function testsFailed(failed) {
  return function({suite}) {
    assert.equal(suite.failed, failed, 'Tests failed');
  };
}

function hasNoErrors({reporter}) {
  assert.equal(reporter.errors.length, 0, 'Reporter has no internal errors');
}

function hasNoUnitErrors({reporter}) {
  assert.equal(reporter.unitErrors.length, 0, 'Reporter has no unit errors');
}

function hasNoScriptErrors({reporter}) {
  assert.equal(reporter.scriptErrors.length, 0, 'Reporter has no script errors');
}

function hasNoAnyErrors(value) {
  hasNoErrors(value);
  hasNoUnitErrors(value);
  hasNoScriptErrors(value);
}

function onUnitErrors(emit) {
  return function({reporter}) {
    emit(reporter.unitErrors);
  };
}

function onScriptErrors(emit) {
  return function({reporter}) {
    emit(reporter.scriptErrors);
  };
}

// Tests

async function runTests() {
  await testScript(({it}) => {
    it('Should be fine', () => {
      assert.equal(42, 42, '42 equals 42');
    });
  })
  .then(res => pipe(res,
    hasNoAnyErrors,
    shouldBeCompleted,
    shouldBeOk,
  ));

  await testScript(({describe, it}) => {
    describe('Nested', () => {
      it('Should be fine', () => {
        assert.equal(42, 42, '42 equals 42');
      });
    });
  })
  .then(res => pipe(res,
    hasNoAnyErrors,
    shouldBeCompleted,
    shouldBeOk,
    testsTotal(1),
    testsPassed(1),
    testsFailed(0),
  ));

  await testScript(({describe, it}) => {
    describe('Deeply nested sections', () => {
      describe('Deeply nested sections', () => {
        it('Should be fine', () => {
          assert.equal(42, 42, '42 equals 42');
        });
      });
    });
  })
  .then(res => pipe(res,
    hasNoAnyErrors,
    shouldBeCompleted,
    shouldBeOk,
    testsTotal(1),
    testsPassed(1),
    testsFailed(0),
  ));

  await testScript(({describe, use, it}) => {
    describe('Using context', () => {
      use(async (ctx, next) => {
        await next({n: 42});
      });

      it('Should be fine', ({n}) => {
        assert.equal(n, 42, '42 equals 42');
      });
    });
  })
  .then(res => pipe(res,
    shouldBeCompleted,
    shouldBeOk,
    hasNoAnyErrors,
    testsTotal(1),
    testsPassed(1),
    testsFailed(0),
  ));

  await testScript(({describe, each, it}) => {
    describe('Using batch context', () => {
      each(
        async (ctx, next) => {
          await next({n: 42});
        },
        () => {
          it('Should be fine', ({n}) => {
            assert.equal(n, 42, '1) 42 equals 42');
          });

          it('Should be fine', ({n}) => {
            assert.equal(n, 42, '2) 42 equals 42');
          });
        }
      );
    });
  })
  .then(res => pipe(res,
    shouldBeCompleted,
    shouldBeOk,
    hasNoAnyErrors,
    testsTotal(2),
    testsPassed(2),
    testsFailed(0),
  ));

  await testScript({n: 42}, ({describe, each, it}) => {
    describe('Using root context', () => {
      each(
        () => {
          it('Should be fine', ({n}) => {
            assert.equal(n, 42, '42 equals 42');
          });
        }
      );
    });
  })
  .then(res => pipe(res,
    shouldBeCompleted,
    shouldBeOk,
    hasNoAnyErrors,
    testsTotal(1),
    testsPassed(1),
    testsFailed(0),
  ));

  await testScript(({it}) => {
    it('Should not be fine', (_, next) => {
      return next(true);
    }, () => {});
  })
  .then(res => pipe(res,
    shouldBeNotCompleted,
    shouldBeNotOk,
    hasNoScriptErrors,
    onUnitErrors(
      ([error]) => assert.ok(/Context.*Object/.test(error.message))
    ),
    testsTotal(1),
    testsPassed(0),
    testsFailed(0),
  ));

  await testScript(({it}) => {
    it('Should be fine', () => {
      throw new Error('test');
    }, () => {});
  })
  .then(res => pipe(res,
    shouldBeNotCompleted,
    shouldBeNotOk,
    hasNoScriptErrors,
    onUnitErrors(([error]) => assert.equal(error.message, 'test')),
    testsTotal(1),
    testsPassed(0),
    testsFailed(0),
  ));

  await testScript(() => {
    throw new Error('test');
  })
  .then(res => pipe(res,
    shouldBeNotCompleted,
    shouldBeNotOk,
    hasNoUnitErrors,
    onScriptErrors(([error]) => assert.equal(error.message, 'test')),
    testsTotal(0),
    testsPassed(0),
    testsFailed(0),
  ));

  await testScript(({describe}) => {
    describe(null);
  })
  .then(res => pipe(res,
    shouldBeNotCompleted,
    shouldBeNotOk,
    hasNoUnitErrors,
    onScriptErrors(
      ([error]) => assert.ok(/Handler.*function/.test(error.message))
    ),
    testsTotal(0),
    testsPassed(0),
    testsFailed(0),
  ));

  // Internal errors should be ejected
  await assert.rejects(() => runScript({
    script: ({describe, it}) => {
      describe('Test', () => {
        it('Test', () => {});
      });
    },
    reporter: {},
  }));

  console.log('All tests passed');
}

// Run test suite

runTests()
.catch((error) => {
  console.error(error);
  return 1;
})
.then((code = 0) => process.exit(code));
