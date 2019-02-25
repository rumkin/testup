const path = require('path');

const chalk = require('chalk');

const createToken = (type) => (value) => ({type, value});
const t = {
  info: createToken('info'),
  error: createToken('error'),
  comment: createToken('comment'),
  text: createToken('text'),
};
const tt = function(segments, ...values) {
  const out = new Array(segments.length + values.length);
  out[0] = t.text(segments[0]);
  for (let i = 1; i < segments.length; i++) {
    const value = values[i];
    const segment = segments[i];

    if (typeof value === 'object') {
      out.push(value);
      if (segment.length) {
        out.push(t.text(segment));
      }
    }
    else if (value.length + segment.length > 0) {
      out.push(t.text(value + segment));
    }
  }
  return out;
};

class TapReporter {
  constructor({
    dir,
    lineLength,
    output,
  } = {}) {
    if (! output) {
      throw new Error('Output not provided');
    }

    this.dir = dir;
    this.lineLength = lineLength;

    this.output = output;
  }

  write(...tokens) {
    for (const token of tokens) {
      this.output.write(token);
    }
  }

  startCase() {}

  endCase(unit) {
    const {index} = unit;

    let label = (unit.label || unit.type);
    let msg;

    if (unit.error) {
      const {error} = unit;

      if (error.assertion) {
        const location = getErrorLocation(error, this.dir);
        msg = toYamlLike({
          message: error.message,
          operator: error.assertion.params.operator,
          actual: error.assertion.params.actual,
          expect: error.assertion.params.expected,
          location,
        }, {dir: this.dir});
      }
      else {
        msg = toYamlLike({
          message: error.message,
          location: error.location,
        }, {dir: this.dir});
      }
    }

    // const prefix = '  ';
    // const lineLength = (i) => i > 0
    //   ? this.lineLength - prefix.length
    //   : this.lineLength;
    //
    // const prefixLine = (line, i) => i > 0
    //   ? `${prefix}${line}`
    //   : line;
    const status = unit.error ? t.error('ok') : t.success('not ok');
    this.write(
      t.comment(unit.path.join(' : ') + '\n'),
      ...tt`${status} ${index} - ${label}\n`,
    );

    if (msg) {
      this.write(t.text('---\n'), ...msg, t.text('\n...\n'));
    }
  }

  startSuite(section) {
    if (! section.isRoot) {
      return;
    }
    const start = Math.min(1, this.total);
    const end = section.total;

    this.write(
      t.info(`TAP version 13\n${start}..${end}\n`)
    );
  }

  endSuite({isRoot, total, passed}) {
    if (! isRoot) {
      return;
    }

    const fail = total - passed;
    const rate = (total !== 0)
      ? passed / total
      : 0;

    this.output('');
    this.output('# test: ' + chalk.bold(total));
    this.output('# pass: ' + chalk.bold(passed));
    this.output('# fail: ' + chalk.bold(fail));
    this.output('# rate: ' + chalk.bold((rate * 100).toFixed(2)) + '%');
  }

  reportBrokenUnit(unit, error) {
    let msg = 'Bail out! Unit error:\n';
    msg += ' ' + (unit.label || unit.type) + ' at ' + unit.path.join(' / ') + '\n';
    if (error) {
      msg += error.stack;
    }
    this.output('\n' + msg);
  }

  reportBrokenScript(error) {
    this.output(
      'Bail out! Script failure:\n' + error.message + error.stack.replace(error.message, '')
    );
  }

  reportError(error) {
    this.output(
      'Bail out! Unexpected error:\n' + error.message + error.stack.replace(error.message, '')
    );
  }
}

function getNewlineIndex(text, length) {
  for (let i = 0; i < length; i++) {
    const char = text[i];

    if (char === '\n') {
      return i;
    }
  }

  return -1;
}

function wordWrap(text, length, map = (v) => v) {
  const out = [];
  const getLength = typeof length === 'number' ? () => length : length;

  while (text.length) {
    const maxLength = getLength(out.length);
    let lineEnd = getNewlineIndex(text, maxLength);
    let line;
    if (lineEnd < 0) {
      line = text.slice(0, maxLength);
      text = '';
    }
    else {
      line = text.slice(0, lineEnd);
      text = text.slice(lineEnd + 1);
    }

    out.push(line.trimEnd());
  }

  return out.map(map).join('\n');
}

// Yaml output

function isMultiline(value) {
  return /\r|\r?\n/.test(value);
}

function isEscapeable(value) {
  return /^(\s|\w)+$/.test(value) === false;
}

function escape(value) {
  return '"' + value.replace(/\\/g, '\\\\')
  .replace(/\"/g, '\\\"') + '\"';
}

function safeValue(value, indent) {
  const _value = String(value);
  if (isMultiline(_value)) {
    return '>\n' + wordWrap(_value, 80, indent);
  }
  else if (isEscapeable(_value)) {
    return escape(_value);
  }

  return value;
}

function toYamlLike(values, {indent = 0, dir} = {}) {
  const keys = Object.getOwnPropertyNames(values);
  const maxLength = keys.reduce((result, key) => Math.max(result, key.length), 0);
  const out = [];
  const prefix = ' '.repeat(indent);
  for (const key of keys) {
    const align = ' '.repeat(maxLength - key.length);
    const value = values[key];
    const coloredKey = chalk.grey(key + ':');
    if (Array.isArray(value)) {
      out.push(`${prefix}${coloredKey}`);
      value.forEach((item) => {
        if (! item.startsWith(dir + path.sep)) {
          item = chalk.gray(safeValue(item));
        }
        else {
          item = safeValue(item);
        }
        out.push(`${prefix}  - ${item}`);
      });
    }
    else if (value !== undefined) {
      out.push(`${prefix}${coloredKey} ${align}${safeValue(value, prefix + '  ')}`);
    }
  }
  return out.join('\n');
}
function getErrorLocation(error, dir) {
  const origin = Error.prepareStackTrace;
  Error.prepareStackTrace = getLocationTrace(dir);
  error.stack;
  Error.prepareStackTrace = origin;
  return error.location || error.stack.replace(error.message, '');
}

function getLocationTrace(dir) {
  return (error, trace) => {
    const string = prepareStackTrace(error, trace);

    const location = [...trace.map((item) => {
      const filename = path.relative(dir, item.getFileName() || '.');
      const line = `${filename}:${item.getLineNumber()}:${item.getColumnNumber()}`;
      return line;
    })];
    error.location = location;
    return string;
  };
}

function prepareStackTrace(error, stack) {
  let trace = error.message + '\n\n';
  let maxWidth = 0;
  for (let i = 0; i < stack.length; i++){
    let frame = stack[i];

    let typeLength = 0;
    typeLength = (frame.getTypeName() !== null && frame.getTypeName() !== '[object global]') ? frame.getTypeName().length : 0;
    typeLength = typeLength.length > 50 ? 50 : typeLength;

    let funcLength = frame.getFunctionName() !== null ? frame.getFunctionName().length : '<anonymous>'.length;
    funcLength = funcLength > 50 ? 50 : funcLength;

    if (typeLength + funcLength > maxWidth) {
      maxWidth = typeLength + funcLength;
    }
  }

  for (let i = 0; i < stack.length; i++) {
    let frame = stack[i];

    let filepath = frame.getFileName();

    let typeName = '';
    if (frame.getTypeName() !== null && frame.getTypeName() !== '[object global]') {
      typeName = frame.getTypeName().substring(0, 50) + '.';
    }

    let functionName = '<anonymous>';
    if (frame.getFunctionName() !== null) {
      functionName = frame.getFunctionName().substring(0, 50);
    }

    let space = '';
    let width = maxWidth - (typeName.length + functionName.length) + 3;
    space = Array(width).join(' ');
    let line = '  at ' + typeName + functionName + space + filepath +
        ' (' + frame.getLineNumber() +
        ':' + frame.getColumnNumber() + ')\n';

    trace += line;
  }
  return trace;
};

module.exports = TapReporter;
