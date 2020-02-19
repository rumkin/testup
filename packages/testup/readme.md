# Testup

This is a basic installation of testup modules which includes:
* @testup/core,
* @testup/cli,
* @testup/console-reporter.

## Installation

```shell
npm i testup
```

## Usage

1. Create spec file, for example `tests/index.spec.js`:
    ```js
    const assert = require('assert')
    
    module.exports = ({describe, it}) => {
      describe('Subject', () => {
        it('test', (ctx, test) => {
          const str = 'Hello, World!'

          assert.equal(str, 'Hello, World!', 'String is "Hello, World!"')
          test.done()
        })
      })
    }
    ```
2. Add npm `test` script into `package.json`:
    ```json
    {
      "scripts": {
        "test": "testup run test/*.spec.js"
      }
    }
    ```
3. Run tests:
    ```shell
    npm test
    ```

## License

MIT © [Rumkin](https://rumk.in)
