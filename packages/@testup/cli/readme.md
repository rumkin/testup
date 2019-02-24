# TestUp

This package provide CLI-interface to run test scripts for NPM package tests

# Usage

Install TestUp cli and core packages:

```
npm i testup @testup/core
```

Install TestUp reporter. For example TAP or Console:

```
npm i @testup/console-reporter
npm i @testup/tap-reporter
```

Create .testuprc file:
```
{
  "reporter": "console"
  "reporterConfig": {
    "colorize": false
  }
}
```
