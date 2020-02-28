# Testup Kit

> Part of the [TestUp](https://github.com/testup) test running suite.

Testup helpers kit.

## Install

```shell
npm i @testup/kit
```

## API

### `define()`

```ts
interface DefineFn {
  (prop: string, value: any): ModifierFn
  (props: Object): ModifierFn
}
```

Define creates a modifier which define context property or properties.

```js
import assert from 'assert'
import {define} from '@testup/kit'

export default ({use, it}) => {
  use(define('value', 42))

  it('Test value', (test, {value}) => {
    assert.equal(value, 42, 'Is 42')

    test.end()
  })
}
```

## License

MIT © [Rumkin](https://rumk.in)
