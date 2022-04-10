import Table from 'cli-table';
import { Note } from '../models/note-model';
import Cli from '../services/cli';
import { timeLogService } from '../services/time-log.service';
import Base from './base';

export interface TimeLogConfig {
  username: string;
  timespan: 'day';
}

export class TimeLog extends Base {
  constructor(private config: TimeLogConfig) {
    super();
  }

  public async execute() {
    Cli.startSpinner('loading issues...');
    const notes = await timeLogService.getUserDailyTimeLogs(
      this.config.username,
    );
    Cli.stopSpinner();
    const table = this.createUserNoteTable(notes);
    console.log("\n" +  table.toString());
  }

  private createUserNoteTable(notes: Note[]) {
    const table = new Table({
      head: ['user', 'issue', 'time log'],
      colors: true,
    });

    notes.forEach((note) => {
      table.push([
        note.author.username,
        note.issue?.web_url + '#' + note.id,
        note.body,
      ]);
    });

    return table;
  }
}
