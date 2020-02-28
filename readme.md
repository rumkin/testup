# TestUp

TestUp is test running tool. It's created to be modular and use nested context
to make tests simple, clear and reusable.

## Install

```shell
npm i testup
# or
npm i @testup/cli @testup/core @testup/console-reporter
```

## Usage

Create `test/module.spec.js`:

```js
import assert from 'assert'

export default ({describe, it}) => {
  describe('Test module', () => {
    it('Answer is 42', (test) => {
      assert.ok(42 !== "42", '42 not equal "42"')

      test.end()
    })
  })
}
```

Run in shell

```shell
testup run test/module.spec.js
```

### Modular tests with contexts

To make tests modular TestUp uses contexts for passing values
to underlaying tests.

```js
import {define} from '@testup/kit'
import assert from 'assert'

export default ({describe, it}) => {
  describe('Test module', () => {
    use(define('answer', 42))

    it('Answer is 42', (test, {answer}) => {
      assert.equal(42, answer)

      test.end()
    })
  })
}
```

## Packages

* [`@testup/core`](packages/@testup/core) – TestUp Core.
* [`@testup/cli`](packages/@testup/cli) – TestUp Cli running tool.
* [`@testup/console-reporter`](packages/@testup/console-reporter) – Unified console test reporter.
* [`@testup/tap-reporter`](packages/@testup/tap-reporter) – TAP reporter.

## API

### `describe()`
```ts
interface DescribeFn {
  (label: string, handler: ScriptFn): void
}
```

This method allow to group tests.

```js
describe('Array', () => {
  describe('#find', () => {
    it('Finds element in array', (test) => {
      // Test body
      test.end()
    })
  })
})
```

### `it()`
```ts
interface ItFn {
  (label: string, ...modifiers: ModifierFn, test: TestCaseFn): void
}
```

Specify single test unit.

```js
it('The Answer should be 42', (test) => {
  assert.equal(answerTheQuestionOfLife(), 42, 'The answer is 42')
  test.end()
})
```

### `use()`

```ts
interface UseFn {
  (modifier: ModifierFn): void
}
```

Add modifier to current test group. This modifier will be executed once for whole
group.

```js
describe('database', () => {
  use(async (context, next) => {
    const db = new Db()

    await db.connect()
    try {
      // Run tests
      await next({
        ...context,
        db,
      })
    }
    finally {
      await db.disconnect()
    }
  })

  it('Should query document from db', async ({db}) => {
    const user = await db.getRepo('users').findById(1)

    assert.ok(user !== null)
  })
})
```

### `each()`

```ts
interface EachFn {
  (modifiers: ModifierFn): void
}
```

Define modifiers for descendant test units, groups and tests. Wrappers will be
executed for each test.

```js
const counter = (c = 0) => (context, next) => next({...context, count: ++c})

describe('Group', () => {
  each(
    counter(),
    () => {
      it('Should be equal 1', ({count}) => {
        assert.equal(count, 1)
      })

      it('Should be equal 2', ({count}) => {
        assert.equal(count, 2)
      })
    }
  )
})
```

## Types

### `Test`
```ts
interface Test {
  delay(timeout: number): Promise<void>
  end():void
}
```

Test has single method `end` which tells that test script reached the end.

### `TestCaseFn()`
```ts
interface TestCaseFn {
  (context: Object, test: Test): void
}
```

The last argument of `it` function. It contains test body and should throw
assert exceptions. It accepts `context` argument which contains values
defined by modifiers from higher levels of test script.

### `ModifierFn()`
```ts
interface ModifierFn {
  (context: Object, next: () => Promise<void>): void|Promise<void>
}
```

Modifier is a function that modify context somehow before pass it to lower
levels of test script.

### `ScriptFn()`
```ts
interface ScriptFn {
  (handlers: {describe:DescribeFn, use:UseFn, it:ItFn, each:EachFn}): void
}
```

This function set up test units. It creates groups and test bodies.

## License

MIT © [Rumkin](https://rumk.in)
