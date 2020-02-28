# TestUp Core

> Part of the [TestUp](https://github.com/testup) test running suite.

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

    test.end()
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

### `RunScriptFunc()`

Executes test script.

```ts
interface RunScriptFunc {
  (params: {
    script: ScriptFunc
    context: Context
    reporter: Reporter
    root: Suite
  }): Promise<Report>
}
```

### `ScriptFunc()`

Script is a function which produce test script using Handlers.

```ts
interface ScriptFunc {
  (handlers: Handlers): void
}
```

### `Handlers{}`

Handlers object is a set of methods for describing the test script.

```ts
interface Handlers {
  describe(title: string, suite: ScriptFunc): void
  it(title: string, ...modifiers: ModifierFunc, test: TestCaseFunc): void
  use(modifier: ModifierFunc): void
  each(ModifierFunc, suite: ScriptFunc|void): void
}
```

### `TestCaseFunc()`
```ts
interface TestCaseFunc {
  (test: Test, context: Context)}: void|Promise<void>
}
```

Test case is a minimal unit of test script. It runs some code which should pass
assertion.

Simple assertion example:
```js
it('42 is 42', (test) => {
  assert.equal(42, '42')
  test.end()
})
```

Context usage example:
```js
it('User exists', async (test, {db}) => {
  const user = await db.findOne('users', {id: 1})

  assert.ok(user !== null, 'User exists')
  test.end()
})
```

### `Context{}`

```ts
interface Context extends Object {
  __proto__: Context|Object
}
```

Context is a regular object containing properties required for test execution.
Contexts are presented by nested objects. Here is how contexts are nesting:

```js
Object.assign(
  Object.create(oldContext),
  newContext,
)
```

### `Test{}`

Test is testcase util it's using within a test to determine whether it has been
ended or not, and provide utils, like timer delay.

```ts
interface Test {
  delay(timeout: number): Promise<void>
  end():void
}
```

#### Example

```js
// Will throw due to timeout
it('Test with delay', async (test) => {
  await new Promise((resolve) => setTimeout(resolve, 2000))
  test.end()
})

// Will pass due to delay is used
it('Test with delay', async (test) => {
  await test.delay(2000)
  test.end()
})
```

### `ModifierFunc()`

```ts
interface ModifierFunc {
  (context: Context, next: NextFunc): void|Promise<void>
}
```

#### Example

This example shows how to wrap followed calls to test DB. It initiates and
destroys DB connection immediately after all tests complete.

```js
describe('Database', ({use}) => {
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
    
    test.end()
  })
})
```

## License

MIT © [Rumkin](https://rumk.in)
