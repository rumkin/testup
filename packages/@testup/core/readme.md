# TestUp Core

TestUp is a test runner library. It contains two abstractions Runner
and Reporter. This abstractions describes how to run tests and how to receive
a report.

## Install

```
npm i @testup/core
```

## Usage

```js
import should from 'should';

import {runScript} from '@testup/core';
import ConsoleReporter from '@testup/console-reporter';

const reporter = new ConsoleReporter(console);

const script = ({it}) => {
  it('Should be 42', () => {
    should(42).be.equal('42');
  });
};

run({
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
});
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

Script is a function which produce test script using Handles.
```
(handles: Handles) -> void
```

### `Handles{}`

Handles is set of methods that are using to describe test script.

```
{
  describe: (title: String, fn: (test: Handles) -> void),
  it: (title: String, [...wrappers: wrapper,] fn: testCase ) -> void,
  use: (wrapper) -> void,
  each: (...wrappers: wrapper, fn:Function) -> void,
}
```

### `testCase()`
```
(context: Object) -> void|Promise<void,Error>
```

Test case is a minimal unit of test script. It runs some code which should pass
assertion.

Simple assertion example:
```js
it('42 is 42', () => {
  assert.equal(42, '42');
});
```

Context usage example:
```js
it('User exists', async ({db}) => {
  const user = await db.findOne('users', {id: 1});

  assert.ok(user !== null, 'User exists');
});
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
    const db = await Db.connect();
    try {
      // Pass db within a context
      await next({
        ...context,
        db,
      });
    }
    finally {
      // Destroy connection when all tests are finished.
      db.disconnect();
    }
  });

  // Drop database after test case is finished
  async function rollback({db}, next) {
    try {
      await next();
    }
    finally {
      await db.dropDatabase();
    }
  }

  it('Test document creation', rollback, async ({db}) => {
    await db.getRepo('users').create({
      username: 'user',
    });

    const user = await db.getRepo('users')
    .findOne({
      username: 'user',
    });

    assert(user !== null, 'user created');
  });
});
```

## License

MIT © [Rumkin](https://rumk.in)
