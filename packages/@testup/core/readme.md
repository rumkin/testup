# TestUp Core

TestUp is a test runner library. It contains two abstractions Runner
and Reporter. This abstractions describes how to run tests and how to receive
a report.

## Usage

```js
import run from '@testup/core';
import ConsoleReporter from '@testup/console-reporter';

const reporter = new ConsoleReporter(console);

const script = ({it}) => {
  it('Should be 42', () => {
    should(42).be.equal('42');
  });
};

run(script, {reporter});
```

## API

## `Run()`

Executes test script.

```
(script: Script, {context: Object, reporter: Reporter}) -> Promise<Report,Error>
```
### `Script()`

Script is a function which produce test script using Handles.
```
(handles: Handles) -> void
```

## `Handles{}`

Handles is set methods that are using to describe test script.

```
{
  describe: (title: String, fn: (test: Handles) -> void),
  it: (title: String, [...wrappers: Wrapper,], fn: TestCase ) -> void,
  use: (Wrapper) -> void,
  define: ((context: Object) -> Object) -> void,
  within: ((context: Object, next: TestCase) -> Promise<() -> void,Error>) -> void,
}
```

### `TestCase()`
```
(context: Object) -> Promise<void,Error>
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
it('User exists', ({db}) => {
  const user = await db.findOne('users', {id: 1});

  assert.ok(user !== null, 'User exists');
});
```

### `Wrapper()`

```
(context: Object, next: TestCase) -> Promise<void, Error>
```

#### Example

This example shows how to wrap followed calls to test DB. It initiates and
destroys DB connection immediately after all tests complete.

```js
describe('Db', (test) => {
  test.use((context, next) => {
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
      // Destroy connection anyway.
      db.disconnect();
    }
  });
});
```

## License

MIT.

## Copyright

© Rumkin, 2018.
