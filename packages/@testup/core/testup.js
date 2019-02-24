async function runScript({
  script,
  context = {},
  reporter,
  suite = new Suite(),
  reportErrors = false,
}) {
  try {
    const handles = new Handles({suite});

    script(handles);
  }
  catch (err) {
    reporter.reportBrokenScript(err);
    return suite;
  }

  const stack = [];

  try {
    await runSuite({
      stack,
      unit: suite,
      context,
      reporter,
    });
  }
  catch (err) {
    if (err instanceof UnitError) {
      reporter.reportBrokenUnit(stack[stack.length - 1], err.origin);
    }
    else if (err instanceof RuntimeError) {
      if (reportErrors) {
        reporter.reportError(err.origin);
      }
      else {
        throw err.origin;
      }
    }
    else {
      if (reportErrors) {
        reporter.reportError(err);
      }
      else {
        throw err;
      }
    }
  }

  return suite;
}

async function runSuite({stack, unit, ctx, reporter}) {
  stack.push(unit);
  reporter.startSuite(unit);

  const nest = createNested(unit.modifier);

  try {
    await nest(ctx, async (subCtx) => {
      for (const subUnit of unit.units) {
        if (subUnit.type === 'case') {
          await runCase({
            stack,
            unit: subUnit,
            ctx: subCtx,
            reporter,
          });
        }
        else {
          await runSuite({
            stack,
            unit: subUnit,
            ctx: subCtx,
            reporter,
          });
        }
      }
    });
  }
  catch (err) {
    if (err instanceof UnitError || err instanceof RuntimeError) {
      throw err;
    }
    else {
      throw new RuntimeError(err);
    }
  }

  unit.end();
  reporter.endSuite(unit);

  stack.pop();
}

async function runCase({stack, unit, ctx, reporter}) {
  stack.push(unit);
  reporter.startCase(unit);

  const nest = createNested(unit.modifier);
  try {
    await nest(ctx, async (subCtx) => {
      try {
        await unit.handler(subCtx);
        unit.end();
      }
      catch (err) {
        unit.end(err);
      }
    });
  }
  catch (err) {
    throw new UnitError(err);
  }

  reporter.endCase(unit);
  stack.pop();
}

class UnitError extends Error {
  constructor(origin) {
    super('Unit error');

    this.origin = origin;
  }
}

class RuntimeError extends Error {
  constructor(origin) {
    super('Unit error');

    this.origin = origin;
  }
}

function createNested(stack) {
  if (! stack.length) {
    return (ctx, next) => next(ctx);
  }

  return (ctx, next) => {
    const [head, ...tail] = stack;

    return head(ctx, (subCtx) => {
      if (subCtx === undefined) {
        subCtx = ctx;
      }
      else if (typeof subCtx !== 'object' || subCtx.constructor !== Object) {
        throw new Error('Context should be instance of Object');
      }
      else {
        Object.freeze(subCtx);
      }

      if (tail.length !== 0) {
        return createNested(tail)(subCtx, next);
      }
      else {
        return next(subCtx);
      }
    });
  };
}

class Handles {
  constructor({suite}) {
    this.stack = [suite];
    this.batchModifiers = [];

    this.describe = (label, handler) => {
      if (typeof handler !== 'function') {
        throw new Error('Handler is not a function');
      }

      const {parent, stack} = this;

      const next = new Suite({
        label,
        parent,
        modifier: getLast(this.batchModifiers),
      });
      parent.push(next);
      stack.push(next);
      handler(this);
      stack.pop();
    };

    this.use = (handler) => {
      if (typeof handler !== 'function') {
        throw new Error('Handler is not a function');
      }

      this.parent.addWrapper(handler);
    };

    this.it = (label, ...modifier) => {
      if (modifier.length === 0) {
        throw new Error('No handler is defined');
      }

      for (const i in modifier) {
        if (typeof modifier[i] !== 'function') {
          throw new Error(`Argument #${i + 2} is not a function`);
        }
      }

      const handler = modifier.pop();
      const {parent} = this;
      parent.push(
        new Case({
          label,
          parent,
          modifier: [
            ...getLast(this.batchModifiers),
            ...modifier,
          ],
          handler,
        })
      );
    };

    this.each = (...handlers) => {
      const fn = handlers.pop();

      this.batchModifiers.push(handlers);
      fn(this);
      this.batchModifiers.pop();
    };

    Object.freeze(this);
  }

  get parent() {
    return this.stack[this.stack.length - 1];
  }
}

function getLast(array) {
  return array.length === 0 ? [] : array[array.length - 1];
}

class Unit {
  constructor({parent}) {
    this.parent = parent;

    this.isCompleted = false;
    this.error = null;
  }

  get type() {
    throw new Error('Not implemented');
  }

  get isOk() {
    throw new Error('No implemented');
  }

  get path() {
    return [...this.parent.path];
  }

  get root() {
    let parent = this;
    while (parent.parent) {
      parent = parent.parent;
    }
    return parent;
  }

  get depth() {
    let parent = this;
    let depth = 0;
    while (parent.parent) {
      parent = parent.parent;
      depth += 1;
    }
    return depth;
  }

  get parents() {
    let parent = this;
    let parents = [];
    while (parent.parent) {
      parent = parent.parent;
      parents.push(parent);
    }
    return parents;
  }

  start() {}

  end() {
    if (this.isCompleted) {
      throw new Error('Already completed');
    }

    this.isCompleted = true;
  }
}

class Suite extends Unit {
  constructor({
    label = '',
    parent = null,
    modifier = [],
    units = [],
  } = {}) {
    super({
      parent,
      handle: null,
    });
    this.label = label;
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this._modifier = modifier;
    this._units = units;
    this.hasUnit = false;
  }

  get type() {
    return 'section';
  }

  get path() {
    if (this.parent !== null) {
      return [...this.parent.path, this.label];
    }
    else {
      return [];
    }
  }

  get isOk() {
    return this.isCompleted && this.passed === this.total;
  }

  get isRoot() {
    return this.parent === null;
  }

  get units() {
    return [...this._units];
  }

  get modifier() {
    return [...this._modifier];
  }

  addWrapper(wrapper) {
    if (this.hasUnit) {
      throw new Error('Cases or sections already defined');
    }

    this._modifier.push(wrapper);
  }

  push(unit) {
    if (! (unit instanceof Unit)) {
      throw new Error('Not a Unit');
    }

    this.hasUnit = true;
    this._units.push(unit);

    if (unit.type === 'case') {
      this.increaseTotal();
    }
  }

  increaseTotal() {
    this.total += 1;
    if (this.parent) {
      this.parent.increaseTotal();
    }
  }

  increasePassed() {
    this.beforeIncrease();

    this.passed += 1;
    if (this.parent) {
      this.parent.increasePassed();
    }
  }

  increaseFailed() {
    this.beforeIncrease();

    this.failed += 1;
    if (this.parent) {
      this.parent.increaseFailed();
    }
  }

  beforeIncrease() {
    if (this.passed + this.failed >= this.total) {
      throw new Error('Invalid tests count');
    }
  }
}

class Case extends Unit {
  constructor({label, parent, modifier, handler}) {
    super({
      parent,
    });

    this.label = label;
    this.modifier = modifier;
    this.handler = handler;
    this.index = parent.total + 1;
    this.error = null;
  }

  get type() {
    return 'case';
  }

  get isOk() {
    return this.isCompleted && this.error === null;
  }

  end(error) {
    super.end();

    if (! error) {
      this.parent.increasePassed();
    }
    else {
      this.parent.increaseFailed();
      this.error = error;
    }
  }
}

exports.runScript = runScript;
exports.Unit = Unit;
exports.Suite = Suite;
exports.Case = Case;
