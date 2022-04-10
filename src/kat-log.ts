import program from 'commander';
import { TimeLog } from './helper/time-log';
import Cli from './services/cli';

program
  .option('-u, --username <username>', 'specify the user')
  .option('--timespan <timespan>', 'day or week')
  .parse(process.argv);

if (!program.username) {
  Cli.error('username not provided!');
}

if (program.timespan && program.timespan !== 'day') {
  Cli.error('timespan only take "day" value');
}

let username: string = program.username;
let timespan: 'day' = program.timespan ? program.timespan : 'day';

new TimeLog({
  username: username,
  timespan: timespan,
}).execute();
