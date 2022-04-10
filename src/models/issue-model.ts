import { MentionedUser } from '../services/multi-assign.service';
import { UserBrief } from './user-brief-model';

export type Issue = {
  id: number;
  iid: number;
  project_id: number;
  description: string;
  closed_at: string;
  title: string;
  state: 'closed' | 'open';
  assignees: UserBrief[];
  labels: string[];
  web_url: string;
  time_stats: {
    time_estimate: number;
    total_time_spent: number;
    human_time_estimate: string;
    human_total_time_spent: string;
  };
  references: {
    short: string;
    relative: string;
    full: string;
  };
  _links: {
    self: string;
    notes: string;
    award_emoji: string;
    project: string;
  };
  mentionedUsers: MentionedUser[];
};
