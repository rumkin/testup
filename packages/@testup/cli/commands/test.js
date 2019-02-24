const command = require('../command');

module.exports = function (cmd) {
  cmd.title('Run test suite');
  cmd.helpful();

  cmd.opt()
  .name('reporter')
  .title('Define reporter module')
  .short('r')
  .long('reporter');

  cmd.opt()
  .name('config')
  .title('Testup config file')
  .short('c')
  .long('config');

  cmd.arg()
  .name('files')
  .title('Test files to run')
  .req()
  .arr();

  cmd.opt()
  .name('package')
  .title('TestUp core package path')
  .short('p')
  .long('package');

  cmd.act(command((opts, args) => {
    const runAction = require('../actions/test');

    return runAction({
      ...opts,
      ...args,
      dir: process.cwd(),
    });
  }));
};
