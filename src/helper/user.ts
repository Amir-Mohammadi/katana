import Table from 'cli-table';
import { Issue } from '../models/issue-model';
import Cli from '../services/cli';
import Base from './base';

export type UserIssuesFilters = {
  labels: string[];
  justClosed: boolean;
};

export class User extends Base {

  public getReport(filters: UserIssuesFilters) {
    Cli.startSpinner('preparing report');

    this._getReport(filters.labels)
      .then((result) => {
        this.writeTable(result);
        Cli.stopSpinner();
      })
      .catch((error) => {
        Cli.error(error);
      });
  }

  private _getReport(label: string[]) {
    return new Promise<Issue[]>((resolve, reject) => {
      let url = `issues?${'scope'}=${'assigned_to_me'}&${'labels'}=${label.join(',')}`;
      this.all(url)
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  private writeTable(list: Issue[]) {
    const table = new Table({
      head: ['issue name', 'time spend', 'time estimate'],
      colors: true,
    });
    list.forEach((element) => {
      if (element.time_stats.human_total_time_spent && element.time_stats.human_time_estimate) {
        table.push([
          element.references.full,
          element.time_stats.human_total_time_spent,
          element.time_stats.human_time_estimate,
        ]);
      }
    });
    console.log('\n');
    console.log(table.toString());
  }
}
