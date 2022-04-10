import { IssuesFilters } from '../helper/group';
import { Issue } from '../models/issue-model';
import { Note } from '../models/note-model';
import BaseService from './base.service';

export type MentionedUser = {
  id: number;
  userName: string;
  name: string;
};
class MultiAssignService extends BaseService {
  constructor() {
    super();
  }

  public async getIssueWithMentionedUsers(
    issues: Issue[],
    filters: IssuesFilters,
  ): Promise<Issue[]> {
    var filteredIssues = await this._filterValidMultiAssignIssues(
      filters,
      issues,
    );
    return await this._getIssueMentionedUsers(filteredIssues);
  }

  private async _filterValidMultiAssignIssues(
    filters: IssuesFilters,
    issues: Issue[],
  ): Promise<Issue[]> {
    let filterValidIssues: Issue[] = [];
    for (let i = 0; i < issues.length; i++) {
      let issue = issues[i]!;

      let isValid = true;
      if (!issue.time_stats.total_time_spent) isValid = false;

      if (issue.closed_at) {
        const closedAt = new Date(issue?.closed_at);

        if (filters.closedAfter) {
          if (closedAt.getTime() < filters.closedAfter.getTime())
            isValid = false;
        }

        if (filters.closedBefore) {
          if (closedAt.getTime() > filters.closedBefore.getTime())
            isValid = false;
        }
      }

      if (isValid === true) filterValidIssues.push(issue!);
    }
    return filterValidIssues;
  }
  private async _getIssueMentionedUsers(issues: Issue[]): Promise<Issue[]> {
    const modifiedIssues: Issue[] = [];
    for (const issue of issues) {
      let modifiedIssue = await this._getIssueNotes(issue);
      modifiedIssues.push(modifiedIssue);
    }
    return modifiedIssues;
  }

  private async _getIssueNotes(issue: Issue): Promise<Issue> {
    const issueProjectId = issue.project_id;
    const issueIid = issue.iid;

    const notes: Note[] = await this.getAll(
      `projects/${issueProjectId}/issues/${issueIid}/notes`,
    );

    const validMentionedUsers = this.getValidMentionedUsers(notes);

    issue.mentionedUsers = validMentionedUsers;

    return issue;
  }

  private getValidMentionedUsers(notes: Note[]): MentionedUser[] {
    let validMentionedUsers: MentionedUser[] = [];
    for (let i = 0; i < notes.length; i++) {
      let note = notes[i];
      var mentionedUserName = this.extractUserNameFromBody(
        note?.body ?? '',
      ).substring(1);
      if (mentionedUserName == note?.author.username) {
        validMentionedUsers.push({
          id: note.author.id,
          name: note.author.name,
          userName: mentionedUserName,
        });
      }
    }
    return validMentionedUsers;
  }

  private extractUserNameFromBody(body: string): string {
    if (body.trim().startsWith('@')) {
      return body;
    }
    return '';
  }
}

const multiAssignService = new MultiAssignService();

export { multiAssignService };
