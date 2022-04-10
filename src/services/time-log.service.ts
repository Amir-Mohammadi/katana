import BuildUrl from 'build-url';
import { DateTime, Zone } from 'luxon';
import { Issue } from '../models/issue-model';
import { Note } from '../models/note-model';
import BaseService from './base.service';

const regex = /added (.*) of time spent(?: at (.*))?/i;
const removeRegex = /removed time spent/i;

class TimeLogService extends BaseService {
  constructor() {
    super();
  }
  
  public async getUserDailyTimeLogs(username: string) {
    await this.validateUsername(username);
    const today = DateTime.now().setZone('Iran').startOf('day');
    const issues = await this._getUserIssues(username, today);
    return this._getIssuesNotes(issues, today);
  }

  public getUserMonthlyTimeLogs(username: string) {
    return null;
  }

  public getUserWeeklyTimeLogs(username: string) {
    return null;
  }

  public getUserMileStoneTimeLogs(username: string) {
    return null;
  }

  private async _getUserIssues(
    username: string,
    updatedAfter?: DateTime,
    updatedBefore?: DateTime,
  ): Promise<Issue[]> {
    const url = BuildUrl('issues', {
      queryParams: {
        assignee_username: username,
        updated_after: updatedAfter?.toISO() ?? '',
        updated_before: updatedBefore?.toISO() ?? '',
        scope: 'all',
      },
    });
    return this.getAll(url);
  }
  private async _getIssueNotes(issue: Issue): Promise<Note[]> {
    const issueProjectId = issue.project_id;
    const issueIid = issue.iid;

    const notes: Note[] = await this.getAll(
      `projects/${issueProjectId}/issues/${issueIid}/notes`,
    );

    return notes.map((note) => {
      note.issue = issue;
      return note;
    });
  }

  private async _getIssuesNotes(
    issues: Issue[],
    updatedAfter?: DateTime,
    updatedBefore?: DateTime,
  ) {
    const allNotes: Note[] = [];
    for (const issue of issues) {
      let notes = await this._getIssueNotes(issue);
      notes = notes.filter(this._isTimeNotes);

      notes = notes.filter((note) =>
        this._isInTheRequestedTime(note, updatedAfter, updatedBefore),
      );

      allNotes.push(...notes);
    }

    return allNotes;
  }

  private _isTimeNotes(note: Note) {
    return (
      note.system && (regex.test(note.body) || removeRegex.test(note.body))
    );
  }

  private _isInTheRequestedTime(
    note: Note,
    updatedAfter?: DateTime,
    updatedBefore?: DateTime,
  ) {
    const noteUpdateDate = DateTime.fromISO(note.updated_at);

    const isUpdatedAfterRequestedTime = updatedAfter
      ? noteUpdateDate.toSeconds() > updatedAfter.toSeconds()
      : true;

    const isUpdatedBeforeRequestedTime = updatedBefore
      ? noteUpdateDate.toSeconds() < updatedBefore.toSeconds()
      : true;

    return isUpdatedAfterRequestedTime && isUpdatedBeforeRequestedTime;
  }
}

const timeLogService = new TimeLogService();
export { timeLogService };
