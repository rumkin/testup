# TestUp Core

This is the core of TestUp test runner. It contains two main components Runner
and Reporter. This abstractions describe how to run tests and how to present
the result.

## Install

```
npm i @testup/core
```

## Usage

```js
import should from 'should'

import {runScript} from '@testup/core'
import ConsoleReporter from '@testup/console-reporter'

const reporter = new ConsoleReporter(console)

const script = ({it}) => {
  it('Should be 42', (test) => {
    should(42).be.equal('42')
    test.done()
  })
}

runScript({
  script,
  reporter,
})
.then((suite) => {
  if (suite.isOk) {
    // All tests are completed and passed.
  }
  else {
    // Some tests are failed or test isn't completed.
  }
})
```

## API

### `runScript()`

Executes test script.

```
({
  script: script,
  context: Object,
  reporter: Reporter,
  root: Suite,
}) -> Promise<Report,Error>
```

### `script()`

Script is a function which produce test script using Handlers.
```
(handlers: Handlers) -> void
```

### `Handlers{}`

Handlers object is a set of methods for describing the test script.

```
{
  describe: (title: String, fn: (test: Handlers) -> void),
  it: (title: String, [...wrappers: wrapper,] fn: testCase ) -> void,
  use: (wrapper) -> void,
  each: (...wrappers: wrapper, fn:Function) -> void,
}
```

### `testCase()`
```
(test:Test, context: Object) -> void|Promise<void,Error>
```

Test case is a minimal unit of test script. It runs some code which should pass
assertion.

Simple assertion example:
```js
it('42 is 42', (test) => {
  assert.equal(42, '42')
  test.done()
})
```

Context usage example:
```js
it('User exists', async (test, {db}) => {
  const user = await db.findOne('users', {id: 1})

  assert.ok(user !== null, 'User exists')
  test.done()
})
```

### `Test{}`

Test is testcase util it's using within a test to determine whether it has been
ended or not, and provide utils, like timer delay.

```
{
  delay: (timeout: number) -> Promise<void>,
  done: () -> void,
}
```

#### Example

```js
// Will throw due to timeout
it('Test with delay', async (test) => {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  test.done()
})

// Will pass due to delay is used
it('Test with delay', async (test) => {
  await test.delay(2000)
  test.done()
})
```

### `wrapper()`

```
(context: Object, next: testCase) -> void|Promise<void, Error>
```

#### Example

This example shows how to wrap followed calls to test DB. It initiates and
destroys DB connection immediately after all tests complete.

```js
describe('Db', ({use}) => {
  use((context, next) => {
    // Initiate connection
    const db = await Db.connect()
    try {
      // Pass db within a context
      await next({
        ...context,
        db,
      })
    }
    finally {
      // Destroy connection when all tests are finished.
      db.disconnect()
    }
  })

  // Drop database after test case is finished
  async function rollback({db}, next) {
    try {
      await next()
    }
    finally {
      await db.dropDatabase()
    }
  }

  it('Test document creation', rollback, async (test, {db}) => {
    await db.getRepo('users').create({
      username: 'user',
    })

    const user = await db.getRepo('users')
    .findOne({
      username: 'user',
    })

    assert(user !== null, 'user created')
    test.done()
  })
})
```

## License

MIT © [Rumkin](https://rumk.in)
