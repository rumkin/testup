# Abstract Reporter

Abstract reporter is interface for other reporters.

## Source

```js
class BaseReporter {
  startSuite() {}
  endSuite() {}
  startCase() {}
  endCase() {}
  reportError() {}
  reportBrokenUnit() {}
  reportBrokenScript() {}
}
```

## License

MIT © [Rumkin](https://rumk.in)
