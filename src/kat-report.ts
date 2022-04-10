import program from 'commander';
import { Group } from './helper/group';

program
  .option('-l, --labels [labels...]', 'specify the labels to filer')
  .option('-c, --closed', 'filter the closed issues')
  .option('-u, --username <username>', 'filter the result to the selected user')
  .option('-m, --milestone <milestone>', 'filter the result for the milestone')
  .option('--closed-after <time>')
  .option('--closed-before <time>')
  .option('-v, --verbose')
  .parse(process.argv);

let labels: string[] = program.labels ? program.labels : [];
let closed: boolean = program.closed ? true : false;
let verbose: boolean = program.verbose ? true : false;
let username: string = program.username ? program.username : '';
let milestone: string = program.milestone ? program.milestone : '';
let closedBefore: Date | undefined = program.closedBefore
  ? new Date(program.closedBefore)
  : undefined;
let closedAfter: Date | undefined = program.closedAfter
  ? new Date(program.closedAfter)
  : undefined;

const group = new Group();
group.getReport({
  justClosed: closed,
  labels: labels,
  milestone: milestone,
  verbose: verbose,
  username: username,
  closedAfter,
  closedBefore,
});
