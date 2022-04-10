import { Spinner } from 'cli-spinner';
import colors from 'colors';

var spinner = new Spinner({
  stream: process.stderr,

  onTick: function (msg) {
    this.clearLine(this.stream);
    this.stream.write(msg);
  },
});
spinner.setSpinnerString('⠋⠙⠚⠞⠖⠦⠴⠲⠳⠓');

class Cli {
  static progress: {
    message: string;
    interval: NodeJS.Timer;
  };

  static error(message: string) {
    Cli.out(`\nerror: ${colors.red(message)}` + '\n');

    process.exit(1);
  }

  static out(string: string) {
    process.stdout.write(string);
  }

  static startSpinner(message: string) {
    spinner.stop();
    spinner.setSpinnerTitle(message);
    spinner.start();
  }

  static stopSpinner() {
    spinner.stop();
  }
}

export default Cli;
