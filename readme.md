# TestUp

TestUp is test running tool. It's created to be modular and use nested context
to make tests simple, clear and reusable.

## Install

```
npm i testup @testup/core @testup/console-reporter
```

## Usage

Add npm script:

```json
{
  "scripts": {
    "test": "testup -r console test/module.spec.js"
  }
}
```

Create `test/module.spec.js`:

```js
const assert = require('assert');

module.exports = ({describe, it}) => {
  describe('Test module', () => {
    use((context, next) => next({
      ...context,
      answer: 42,
    }));

    it('Answer is 42', ({answer}) => {
      assert.equal(42, answer);
    });
  });
};
```

### API

### `describe()`
```
(label:String, ...modifiers:modifier, handler: script) -> void
```

This method allow to group tests.

```js
describe('Array', () => {
  describe('#find', () => {
    it('Finds element in array', () => {
      // Test body
    });
  });
});
```

### `it()`
```
(label:String, ...modifiers:modifier, test: test) -> void
```

Specify single test unit.

```js
it('The Answer should be 42', () => {
  assert.equal(answerTheQuestionOfLife(), 42, 'The answer is 42');
});
```

### `use()`

```
(modifier:modifier) -> void
```

Add modifier to current test group. This modifier will be executed once for whole
group.

```js
describe('database', () => {
  use(async (context, next) => {
    const db = new Db();

    await db.connect();
    try {
      // Run tests
      await next({
        ...context,
        db,
      });
    }
    finally {
      await db.disconnect();
    }
  });

  it('Should query document from db', async ({db}) => {
    const user = await db.getRepo('users').findById(1);

    assert.ok(user !== null);
  });
});
```

### `each()`

```
(...modifiers: modifier, handler: script) -> void
```

Define modifiers for descendant test units, groups and tests. Wrappers will be
executed for each test.

```js

const counter = (c = 0) => (context, next) => next({...context, counter: ++c});

describe('Group', () => {
  each(
    counter(),
    () => {
      it('Should be equal 1', ({counter}) => {
        assert.equal(counter, 1);
      });

      it('Should be equal 2', ({counter}) => {
        assert.equal(counter, 2);
      });
    }
  )
});
```

## Types

### `test()`
```
(context:Object) -> void
```

The last argument of `it` function. It contains test body and should throw
assert exceptions. It accepts `context` argument which contains values
defined by modifiers from higher levels of test script.

### `modifier()`
```
(context:Object) -> void|Promise<void|Error>
```

Modifier is a function that modify context somehow before pass it to lower
levels of test script.

### `script()`
```
({describe, use, it, each}) -> void
```

This function set up test units. It creates groups and test bodies.

## License

MIT © [Rumkin](https://rumk.in)
