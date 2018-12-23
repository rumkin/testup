const path = require('path');

const chalk = require('chalk');

const BaseReporter = require('./base-reporter');

class TapReporter extends BaseReporter {
  constructor({dir, lineLength, output = console.log}) {
    super();

    this.dir = dir;
    this.lineLength = lineLength;

    this.output = output;
  }

  endCase(item) {
    const prefix = '  ';
    const {number} = item;

    let status;
    let title = (item.title || item.type);
    let parent = chalk.gray('# ' + item.path.join(' :: '));
    let msg;

    if (item.error) {
      const {error} = item;
      status = chalk.bold.red('not ok');

      if (error.assertion) {
        const location = getErrorLocation(error);
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
    else if (item.type === 'case') {
      status = chalk.bold.green('ok');
    }
    else {
      return;
    }

    this.output(
      wordWrap(parent, this.lineLength, prefix, 1)
    );
    this.output(
      wordWrap(`${status} ${number} - ${title}`, this.lineLength, prefix, 1)
    );
    if (msg) {
      this.output(
        wordWrap(`---\n${msg}\n...`, this.lineLength, prefix)
      );
    }
  }

  startSection(section) {
    if (! section.isRoot) {
      return;
    }
    const {total} = section;

    this.output('TAP version 13');
    this.output(Math.min(1, total) + '..' + total + '\n');
  }

  endSection({isRoot, total, passed}) {
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

  reportBrokenUnit(item) {
    let msg = 'Bail out!';
    msg += ' ' + (item.title || item.type) + ' at ' + item.path.join(' / ') + '\n';
    if (item.error) {
      msg += item.error.stack;
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
      'Bail out! ' + error.message + error.stack.replace(error.message, '')
    );
  }
}

// Wordwrap output
function cutline(text, length) {
  const line = text.slice(0, length);
  const rn = line.match(/\r|\r?\n/);
  if (rn) {
    return line.slice(0, rn.index + rn[0].length);
  }
  else if (line.length === length) {
    const space = line.match(/\s+(?=\S*$)/);
    if (space) {
      return line.slice(0, space.index + 1);
    }
  }

  return line;
}

function wordWrap(text, length, prefix, skip = 0) {
  const indent = prefix.length;
  const out = [];

  while (text.length) {
    let maxLength = skip > 0 ? length : length - indent;
    let linePrefix = skip > 0 ? '' : prefix;

    let line = cutline(text, maxLength);

    text = text.slice(line.length);
    out.push(linePrefix + line.trimEnd());
  }

  return out.join('\n');
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
function getErrorLocation(error) {
  const origin = Error.prepareStackTrace;
  Error.prepareStackTrace = getLocationTrace;
  error.stack;
  Error.prepareStackTrace = origin;
  return error.location || error.stack.replace(error.message, '');
}

function getLocationTrace(error, trace) {
  const string = prepareStackTrace(error, trace);

  const location = [...trace.map((item) => {
    const filename = path.relative(cwd, item.getFileName() || '.');
    const line = `${filename}:${item.getLineNumber()}:${item.getColumnNumber()}`;
    return line;
  })];
  error.location = location;
  return string;
}

function prepareStackTrace(error, stack) {
  let trace = error.message + '\n\n';
  let maxWidth = 0;
  for (let i = 0; i < stack.length; i++){
    let frame = stack[i];

    let typeLength = 0;
    typeLength = (frame.getTypeName() !== null && frame.getTypeName() !== '[object global]') ? frame.getTypeName().length : 0;
    typeLength = typeLength.length > 50 ? 50 : typeLength;

    functionlength = frame.getFunctionName() !== null ? frame.getFunctionName().length : '<anonymous>'.length;
    functionlength = functionlength > 50 ? 50 : functionlength;

    if (typeLength + functionlength > maxWidth) {
      maxWidth = typeLength + functionlength;
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
