#!/usr/bin/env node

const version = require('../package.json').version;
import program from 'commander';
import dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({
  path: join(__dirname, '..', '.env'),
});

program
  .version(version)
  .command('report', 'report')
  .command('log', 'time log')
  .command('tasks', 'time log')
  .parse(process.argv);
