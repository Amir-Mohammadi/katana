import program from 'commander';
import { Tasks } from './helper/tasks';

program
  .option('-l, --labels [labels...]', 'specify the labels to filer')
  .option('-c, --closed', 'filter the closed issues')
  .option('-u, --username <username>', 'filter the result to the selected user')
  .option('-m, --milestone <milestone>', 'filter the result for the milestone')
  .option('--closed-after <time>')
  .option('--closed-before <time>')
  .option('-v, --verbose')
  .parse(process.argv);

const tasks = new Tasks();

tasks.saveIssuesCSV();
