# TestUp

This package provide CLI-interface to run test scripts for NPM package tests

## Install

Install TestUp cli and core packages:

```
npm i @testup/cli @testup/core
```

Install TestUp reporter. For example TAP or Console:

```
npm i @testup/console-reporter
npm i @testup/tap-reporter
```

## Usage

Create `.testuprc` file:
```
{
  "reporter": "console"
  "reporterOptions": {
    "successMark": "+",
    "failureMark": "-"
  }
}
```

Add npm script:
```json
{
  "scripts": "testup run test.spec.js"
}
```

## License

MIT © [Rumkin](https://rumk.in)
