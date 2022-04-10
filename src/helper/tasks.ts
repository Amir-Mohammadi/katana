import BuildUrl from 'build-url';
import { Issue } from '../models/issue-model';
import Base from './base';
import { Parser, parse } from 'json2csv';
import { json } from 'envalid';

var fields = ['name', 'assignee', 'estimate', 'link'];
interface CSVParser {
  name: string;
  assignee: string;
  estimate: string;
  link: string;
}

const json2csvParser = new Parser<CSVParser>({ fields });

export class Tasks extends Base {
  issueList: Issue[] = [];

  public async saveIssuesCSV() {
    // const doing = await this.fetchIssueList('Doing');
    const todo = await this.fetchIssueList(undefined, 'Done');

    const t = json2csvParser.parse(
      todo.map((item) => {
        return {
          assignee: item.assignees[0]?.username ?? 'no one',
          estimate: item.time_stats.human_time_estimate,
          link: item.web_url,
          name: item.title,
        };
      }),
    );
    console.log(t);
  }
  private fetchIssueList(labels?: string, notIncludeLabel?: string) {
    return new Promise<Issue[]>((resolve, reject) => {
      let url = this.BuildIssueUrl(labels, notIncludeLabel);
      console.log(url);

      this.fetchData<Issue>(url)
        .then((result) => {
          this.issueList = result;
          resolve(result);
        })
        .catch((e) => reject(e));
    });
  }

  private fetchData<T>(url: string) {
    return new Promise<T[]>((resolve, reject) => {
      this.all(url)
        .then((response) => {
          resolve(response);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  private BuildIssueUrl(label?: string, notIncludeLabel?: string) {
    return BuildUrl('projects/11/issues', {
      queryParams: {
        state: 'opened',
        labels: label ?? '',
        scope: 'all',
        'not[labels]': notIncludeLabel ?? '',
      },
    });
  }
}
