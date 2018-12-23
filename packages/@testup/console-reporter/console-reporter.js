class ConsoleReporter {
  startSection(section) {
    console.log('Section start:\n' + section.title);
  }
  endSection() {
    console.log('Section end');
  }

  startCase(tcase) {
    console.log('Start case\n', tcase.title + ':');
  }

  endCase(tcase) {
    console.log('Case end', tcase.hasPass);
  }

  startWrapper() {
    console.log('Wrapper start');
  }

  endWrapper() {
    console.log('Wrapper end');
  }

  reportBrokenUnit(item) {
    console.log(item);
    console.error('Broken unit error', item.error);
  }

  reportBrokenScript(error) {
    console.error('Script is broken', error);
  }

  reportError(error) {
    console.error('Fatal error', error);
  }
}

module.exports = ConsoleReporter;
