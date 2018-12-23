function runScript(script, {
  context = {},
  reporter = defaultReporter,
} = {}) {
  const root = new Section();
  const handles = createHandles(root);
  try {
    script(handles);
  }
  catch (error) {
    reporter.reportBrokenScript(error);
    return Promise.resolve(root);
  }

  return testActions(root.actions, context, reporter)
  .then(onSuccess(root), onFailure(root))
  .catch((reason) => {
    if (reason instanceof Unit) {
      reporter.reportBrokenUnit(reason);
    }
    else {
      reporter.reportError(reason);
    }
  })
  .then(() => root);
}

function createHandles(root) {
  let parent = root;

  const handles = {
    describe(title, handler) {
      const next = new Section({
        title,
        parent,
      });
      parent.add(next);
      const tmp = parent;
      parent = next;
      handler(handles);
      parent = tmp;
    },
    use(handler) {
      parent.add(new Wrapper({
        type: 'use',
        parent,
        handler,
      }));
    },
    within(handler) {
      parent.add(new Wrapper({
        type: 'within',
        parent,
        handler: async (ctx, fn) => {
          const after = handler(ctx);
          try {
            await fn(ctx);
          }
          finally {
            if (after) {
              await after();
            }
          }
        },
      }));
    },
    define(handler) {
      parent.add(new Item({
        type: 'define',
        parent,
        handler: (ctx, fn) => fn(handler(ctx)),
      }));
    },
    it(title, ...handlers) {
      parent.add(
        new Case({
          title,
          parent,
          handler: async (ctx) => {
            let lastCtx = ctx;
            const handle = (tail) => (nextCtx = lastCtx) => {
              lastCtx = nextCtx;
              if (handlers.length > 1) {
                const [handler, ...nextTail] = tail;
                return handler(nextCtx, handle(nextTail));
              }
              else {
                return handlers[0](nextCtx);
              }
            };

            return handle(handlers)(ctx);
          },
        })
      );
    },
  };

  return handles;
}

async function testActions(actions, ctx, reporter) {
  while (actions.length) {
    const item = actions.shift();
    const execute = getExecutor(item.type, actions, ctx, reporter);
    await execute(item);
  }
}

async function testWrapper(item, actions, ctx, reporter) {
  await item.handler(
    ctx, (newCtx = ctx) => testActions(actions, newCtx, reporter)
  );
}

function getExecutor(type, actions, ctx, reporter) {
  switch (type) {
  case 'section': {
    return (item) => {
      item.start();
      reporter.startSection(item);
      return testActions(item.actions, Object.create(ctx), reporter)
      .then(onSuccess(item), onFailure(item))
      .finally(() => {
        reporter.endSection(item);
      });
    };
  }
  case 'use':
  case 'define':
  case 'within': {
    return (item) => {
      item.start();
      reporter.startWrapper(item);
      return testWrapper(item, actions, ctx, reporter)
      .then(onSuccess(item), onFailure(item))
      .finally(() => {
        reporter.endWrapper(item);
      });
    };
  }
  case 'case': {
    return (item) => {
      item.start();
      reporter.startCase(item);
      return item.handler(Object.create(ctx))
      .then(onSuccess(item), onFailure(item))
      .finally(() => {
        reporter.endCase(item);
      });
    };
  }
  default:
    throw new Error('Unknown testsuit type "' + type + '".');
  }
}

function onSuccess(item) {
  return () => {
    item.end();
  };
}

function onFailure(item) {
  return (err) => {
    const isUnit = err instanceof Unit;

    if (isUnit) {
      item.end();
    }
    else {
      item.end(err);
    }

    if (item instanceof Case === false) {
      if (isUnit) {
        throw err;
      }
      else {
        throw item;
      }
    }
  };
}

class Unit {
  constructor({type, parent}) {
    this.type = type;
    this.parent = parent;

    this.isCompleted = false;
    this.error = null;
  }

  get hasPass() {
    return this.isCompleted === true && this.error === null;
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

  start() {}

  end(error = null) {
    if (this.isCompleted) {
      throw new Error('Already completed');
    }

    this.isCompleted = true;
    if (error) {
      this.error = error;
    }
  }

  atParents(fn) {
    let parent = this;
    while (parent = parent.parent) {
      fn(parent);
    }
  }
}

class Section extends Unit {
  constructor({title = '', parent = null} = {}) {
    super({
      type: 'section',
      parent,
      handle: null,
    });
    this.title = title;
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.actions = [];
  }

  get path() {
    if (this.parent !== null) {
      return [...this.parent.path, this.title];
    }
    else {
      return [];
    }
  }

  add(unit) {
    if (! (unit instanceof Unit)) {
      throw new Error('Not a Unit');
    }

    this.actions.push(unit);
    if (unit.type === 'case') {
      this.total += 1;
      this.atParents((parent) => {
        parent.total += 1;
      });
    }
  }

  increasePassed() {
    this.passed += 1;
    this.checkConsistency();
  }

  increaseFailed() {
    this.failed += 1;
    this.checkConsistency();
  }

  checkConsistency() {
    if (this.passed + this.failed > this.total) {
      throw new Error('Invalid tests count');
    }
  }
}

class Case extends Unit {
  constructor({title, parent, handler}) {
    super({
      type: 'case',
      parent,
    });

    this.title = title;
    this.handler = handler;
  }

  end(error) {
    super.end(error);

    if (! error) {
      this.atParents((parent) => {
        parent.increasePassed();
      });
    }
    else {
      this.atParents((parent) => {
        parent.increaseFailed();
      });
    }
  }
}

class Wrapper extends Unit {
  constructor({type, parent, handler}) {
    super({
      type,
      parent,
      handler,
    });

    this.handler = handler;
  }
}

module.exports = runScript;
runScript.Unit = Unit;
runScript.Section = Section;
runScript.Wrapper = Wrapper;
runScript.Case = Case;
