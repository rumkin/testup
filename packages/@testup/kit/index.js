/* global window define */
(function(mod) {
  if (typeof module === 'object' && typeof exports === 'object') {
    mod(exports)
  }
  else if (typeof define === 'function' && define.amd) {
    define([], function() {
      const exports = {}
      mod(exports)
      return exports
    })
  }
  else {
    mod(window.TestupKit = {})
  }
})(function(exports){
  function define(prop, value) {
    if (typeof prop === 'object') {
      return function(ctx, next) {
        return next({...prop})
      }
    }
    else {
      return function(ctx, next) {
        return next({[prop]: value})
      }
    }
  }

  exports.define = define
})
