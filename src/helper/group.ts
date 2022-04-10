import BuildUrl from 'build-url';
import Table from 'cli-table';
import { Parser } from 'json2csv';
import { Issue } from '../models/issue-model';
import { MergeRequest } from '../models/merge-request-model';
import { UserBrief } from '../models/user-brief-model';
import Cli from '../services/cli';
import { multiAssignService } from '../services/multi-assign.service';
import Base from './base';
import { Time } from './time';
import { writeFileSync } from 'fs';

export type GroupReport = {
  name: string;
  totalIssue: number;
  totalMergeRequest: number;
  totalSpendTime: number;
  totalEstimateTime: number;
};

export type FullReport = {
  taskOwnerName: string;
  SpendTime: number;
  EstimateTime: number;
  issueUrl: string;
  issueType: IssueType;
  taskName: string;
};

export type IssuesFilters = {
  labels: string[];
  justClosed: boolean;
  milestone: string;
  verbose: boolean;
  username: string;
  closedAfter?: Date;
  closedBefore?: Date;
};

export enum IssueType {
  normal = 'normal',
  multiAssign = 'multiAssign',
}

export class Group extends Base {
  filters?: IssuesFilters = undefined;
  issueList: Issue[] = [];
  multipleAssigneeIssueList: Issue[] = [];
  mergeRequestList: MergeRequest[] = [];

  public getReport(filters: IssuesFilters) {
    this.filters = filters;

    Cli.startSpinner('retrieving data ...');

    this.validateUsername()
      .then(() => {
        Promise.all([
          this.fetchIssueList(),
          this.fetchMergeRequestList(),
          this.fetchMultipleAssigneeIssueList(),
        ])
          .then(() => {
            Cli.stopSpinner();
            if (filters.verbose) {
              let report = this.prepareFullReport();
              this.writeFullTable(report);
              this.saveAsCsv(report);
            } else {
              let report = this.prepareGroupReport();
              this.writeGroupTable(report);
            }
          })
          .catch((error) => {
            Cli.error(error);
          });
      })
      .catch((error) => {
        Cli.error(error);
      });
  }

  private fetchIssueList() {
    return new Promise<void>((resolve, reject) => {
      let url = this.BuildIssueUrl();
      this.fetchData<Issue>(url)
        .then((result) => {
          this.issueList = result;
          resolve();
        })
        .catch((e) => reject(e));
    });
  }

  private fetchMultipleAssigneeIssueList() {
    return new Promise<void>((resolve, reject) => {
      let url = this.BuildMultipleAssigneeIssueUrl();
      this.fetchData<Issue>(url)
        .then(async (result) => {
          this.multipleAssigneeIssueList = await multiAssignService.getIssueWithMentionedUsers(
            result,
            this.filters!,
          );
          resolve();
        })
        .catch((e) => reject(e));
    });
  }

  private validateUsername(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.filters!.username == '') resolve();

      let url = this.BuildUsernameValidateUrl();
      this.fetchData<UserBrief[]>(url)
        .then((result) => {
          if (result.length === 0)
            reject(`username "${this.filters!.username}" not found`);
          resolve();
        })
        .catch((e) => reject(e));
    });
  }

  private fetchMergeRequestList() {
    return new Promise<void>((resolve, reject) => {
      let url = this.BuildMergeRequestUrl();
      this.fetchData<MergeRequest>(url)
        .then((result) => {
          this.mergeRequestList = result;
          resolve();
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

  private BuildMultipleAssigneeIssueUrl() {
    return BuildUrl('issues', {
      queryParams: {
        state: this.filters!.justClosed ? 'closed' : 'all',
        labels: ['multiple assignees'],
        scope: 'all',
        ...this.conditionalMember(this.filters!.closedAfter !== undefined, {
          updated_after: this.filters!.closedAfter?.toISOString() ?? '',
        }),
        ...this.conditionalMember(this.filters!.milestone !== '', {
          milestone: this.filters!.milestone,
        }),
      },
    });
  }
  private BuildIssueUrl() {
    return BuildUrl('issues', {
      queryParams: {
        state: this.filters!.justClosed ? 'closed' : 'all',
        ...this.conditionalMember(this.filters!.labels.length !== 0, {
          labels: this.filters!.labels.join(','),
        }),
        scope: 'all',
        ...this.conditionalMember(this.filters!.username !== '', {
          assignee_username: this.filters!.username,
        }),
        ...this.conditionalMember(this.filters!.closedAfter !== undefined, {
          updated_after: this.filters!.closedAfter?.toISOString() ?? '',
        }),
        ...this.conditionalMember(this.filters!.milestone !== '', {
          milestone: this.filters!.milestone,
        }),
      },
    });
  }

  private BuildMergeRequestUrl() {
    return BuildUrl('merge_requests', {
      queryParams: {
        state: this.filters!.justClosed ? 'merged' : 'all',
        ...this.conditionalMember(this.filters!.labels.length !== 0, {
          labels: this.filters!.labels.join(','),
        }),
        scope: 'all',
        ...this.conditionalMember(this.filters!.username !== '', {
          assignee_username: this.filters!.username,
        }),
        ...this.conditionalMember(this.filters!.closedAfter !== undefined, {
          updated_after: this.filters!.closedAfter?.toISOString() ?? '',
        }),
        ...this.conditionalMember(this.filters!.milestone !== '', {
          milestone: this.filters!.milestone,
        }),
      },
    });
  }

  private BuildUsernameValidateUrl() {
    return BuildUrl('users', {
      queryParams: {
        username: this.filters!.username,
      },
    });
  }

  private conditionalMember(
    condition: boolean,
    value: { [name: string]: string | string[] },
  ) {
    return condition && value;
  }

  private prepareGroupReport(): GroupReport[] {
    let usersReport = new Map<number, GroupReport>();

    this.issueList.forEach((element) => {
      if (!element.assignees[0]) return;
      if (!element.time_stats.total_time_spent) return;

      if (element.closed_at) {
        const closedAt = new Date(element.closed_at);

        if (this.filters!.closedAfter) {
          if (closedAt.getTime() < this.filters!.closedAfter.getTime()) return;
        }

        if (this.filters!.closedBefore) {
          if (closedAt.getTime() > this.filters!.closedBefore.getTime()) return;
        }
      }

      let user = usersReport.get(element.assignees[0].id);
      if (user) {
        usersReport.set(element.assignees[0].id, {
          name: user.name,
          totalEstimateTime:
            element.time_stats.time_estimate + user.totalEstimateTime,
          totalIssue: user.totalIssue + 1,
          totalMergeRequest: user.totalMergeRequest,
          totalSpendTime:
            user.totalSpendTime + element.time_stats.total_time_spent,
        });
      } else {
        usersReport.set(element.assignees[0].id, {
          name: element.assignees[0].name,
          totalEstimateTime: element.time_stats.time_estimate,
          totalIssue: 1,
          totalMergeRequest: 0,
          totalSpendTime: element.time_stats.total_time_spent,
        });
      }
    });

    this.mergeRequestList.forEach((element) => {
      if (!element.assignees[0]) return;
      if (!element.time_stats.total_time_spent) return;

      if (element.merged_at) {
        const closedAt = new Date(element.merged_at);

        if (this.filters!.closedAfter) {
          if (closedAt.getTime() < this.filters!.closedAfter.getTime()) return;
        }

        if (this.filters!.closedBefore) {
          if (closedAt.getTime() > this.filters!.closedBefore.getTime()) return;
        }
      }

      let user = usersReport.get(element.assignees[0].id);

      if (user) {
        usersReport.set(element.assignees[0].id, {
          name: user.name,
          totalIssue: user.totalIssue,
          totalMergeRequest: user.totalMergeRequest + 1,
          totalEstimateTime:
            element.time_stats.time_estimate + user.totalEstimateTime,
          totalSpendTime:
            user.totalSpendTime + element.time_stats.total_time_spent,
        });
      } else {
        usersReport.set(element.assignees[0].id, {
          name: element.assignees[0].name,
          totalIssue: 0,
          totalMergeRequest: 1,
          totalEstimateTime: element.time_stats.total_time_spent,
          totalSpendTime: element.time_stats.total_time_spent,
        });
      }
    });

    this.multipleAssigneeIssueList.forEach((item) => {
      if (this.filters!.username !== '') {
        let mentionedUser = item.mentionedUsers.find(
          (x) => x.userName === this.filters!.username,
        );
        if (mentionedUser !== undefined) {
          let user = usersReport.get(mentionedUser.id);
          if (user) {
            usersReport.set(mentionedUser.id, {
              name: user.name,
              totalEstimateTime:
                item.time_stats.time_estimate + user.totalEstimateTime,
              totalIssue: user.totalIssue + 1,
              totalMergeRequest: user.totalMergeRequest,
              totalSpendTime:
                user.totalSpendTime + item.time_stats.total_time_spent,
            });
          } else {
            usersReport.set(mentionedUser.id, {
              name: mentionedUser.name,
              totalEstimateTime: item.time_stats.time_estimate,
              totalIssue: 1,
              totalMergeRequest: 0,
              totalSpendTime: item.time_stats.total_time_spent,
            });
          }
        }
      } else {
        item.mentionedUsers.forEach((mentionedUser) => {
          let user = usersReport.get(mentionedUser.id);
          if (user) {
            usersReport.set(mentionedUser.id, {
              name: user.name,
              totalEstimateTime:
                item.time_stats.time_estimate + user.totalEstimateTime,
              totalIssue: user.totalIssue + 1,
              totalMergeRequest: user.totalMergeRequest,
              totalSpendTime:
                user.totalSpendTime + item.time_stats.total_time_spent,
            });
          } else {
            usersReport.set(mentionedUser.id, {
              name: mentionedUser.name,
              totalEstimateTime: item.time_stats.time_estimate,
              totalIssue: 1,
              totalMergeRequest: 0,
              totalSpendTime: item.time_stats.total_time_spent,
            });
          }
        });
      }
    });

    return [...usersReport.values()];
  }

  private writeGroupTable(list: GroupReport[]) {
    Cli.stopSpinner();

    const table = new Table({
      head: [
        'user',
        'total number of issues',
        'total number of test (merge request)',
        'total time spend',
        'total time estimate',
        'ratio (%)',
      ],
      colors: true,
    });

    list.forEach((element) => {
      table.push([
        element.name,
        element.totalIssue,
        element.totalMergeRequest,
        Time.toHumanReadable(element.totalSpendTime),
        Time.toHumanReadable(element.totalEstimateTime),
        Math.floor((element.totalEstimateTime / element.totalSpendTime) * 100),
      ]);
    });

    table.sort((a, b) => {
      let aRatio = a[5];
      let bRatio = b[5];
      return bRatio - aRatio;
    });

    console.log('\n');
    console.log(table.toString());
  }

  private prepareFullReport(): FullReport[] {
    let usersReport = new Array<FullReport>();
    this.issueList.forEach((element) => {
      if (!element.assignees[0]) return;
      if (!element.time_stats.total_time_spent) return;

      if (element.closed_at) {
        const closedAt = new Date(element.closed_at);

        if (this.filters!.closedAfter) {
          if (closedAt.getTime() < this.filters!.closedAfter.getTime()) return;
        }

        if (this.filters!.closedBefore) {
          if (closedAt.getTime() > this.filters!.closedBefore.getTime()) return;
        }
      }

      usersReport.push({
        EstimateTime: element.time_stats.time_estimate,
        SpendTime: element.time_stats.total_time_spent,
        issueUrl: element.web_url,
        taskOwnerName: element.assignees[0].name,
        issueType: IssueType.normal,
        taskName: element.title,
      });
    });

    this.mergeRequestList.forEach((element) => {
      if (!element.assignees[0]) return;
      if (!element.time_stats.total_time_spent) return;

      if (element.merged_at) {
        const closedAt = new Date(element.merged_at);

        if (this.filters!.closedAfter) {
          if (closedAt.getTime() < this.filters!.closedAfter.getTime()) return;
        }

        if (this.filters!.closedBefore) {
          if (closedAt.getTime() > this.filters!.closedBefore.getTime()) return;
        }
      }

      usersReport.push({
        EstimateTime: element.time_stats.time_estimate,
        SpendTime: element.time_stats.total_time_spent,
        issueUrl: element.web_url,
        taskOwnerName: element.assignees[0].name,
        issueType: IssueType.normal,
        taskName: element.title,
      });
    });
    this.multipleAssigneeIssueList.forEach((element) => {
      if (this.filters!.username !== '') {
        var user = element.mentionedUsers.find(
          (x) => x.userName === this.filters!.username,
        );
        if (user !== undefined) {
          usersReport.push({
            EstimateTime: element.time_stats.time_estimate,
            SpendTime: element.time_stats.total_time_spent,
            issueUrl: element.web_url,
            taskOwnerName: user.name,
            issueType: IssueType.multiAssign,
            taskName: element.title,
          });
        }
      } else {
        element.mentionedUsers.forEach((item) => {
          usersReport.push({
            EstimateTime: element.time_stats.time_estimate,
            SpendTime: element.time_stats.total_time_spent,
            issueUrl: element.web_url,
            taskOwnerName: item.name,
            issueType: IssueType.multiAssign,
            taskName: element.title,
          });
        });
      }
    });
    usersReport.sort((a, b) => {
      return a.taskOwnerName.localeCompare(b.taskOwnerName);
    });

    return [...usersReport.values()];
  }

  private writeFullTable(list: FullReport[]) {
    Cli.stopSpinner();

    const table = new Table({
      head: [
        'user',
        'task url',
        'issue type',
        'time estimate',
        'time spend',
        'ratio (%)',
      ],
      colors: true,
    });

    list.forEach((element) => {
      table.push([
        element.taskOwnerName,
        // element.taskName,
        element.issueUrl,
        element.issueType,
        element.SpendTime == 0
          ? Time.toHumanReadable(element.SpendTime).red
          : Time.toHumanReadable(element.SpendTime),
        element.EstimateTime == 0
          ? Time.toHumanReadable(element.EstimateTime).red
          : Time.toHumanReadable(element.EstimateTime),
        element.SpendTime == 0
          ? Time.toHumanReadable(element.SpendTime).red
          : Time.toHumanReadable(element.SpendTime),
        Math.floor((element.EstimateTime / element.SpendTime) * 100),
      ]);
    });

    console.log('\n');
    console.log(table.toString());
  }

  private saveAsCsv(list: FullReport[]) {
    Cli.stopSpinner();

    var fields = [
      'user',
      'taskName',
      'taskUrl',
      'issueType',
      'timeEstimate',
      'timeSpend',
      'ratio',
    ];

    const json2csvParser = new Parser<CSVParser>({ fields });

    interface CSVParser {
      user: string;
      taskName: string;
      taskUrl: string;
      issueType: string;
      timeEstimate: string;
      timeSpend: string;
      ratio: number;
    }

    const t = json2csvParser.parse(
      list.map((element) => {
        return {
          issueType: element.issueType,
          ratio: Math.floor((element.EstimateTime / element.SpendTime) * 100),
          taskName: element.taskName,
          taskUrl: element.issueUrl,
          timeEstimate: Time.toHumanReadable(element.EstimateTime),
          timeSpend: Time.toHumanReadable(element.SpendTime),
          user: element.taskOwnerName,
        };
      }),
    );

    writeFileSync('out/report.csv', t);
    // console.log(t);
  }
}
