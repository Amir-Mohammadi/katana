import { UserBrief } from './user-brief-model';

export type MergeRequest = {
  id: number;
  merged_at: string;
  assignees: UserBrief[];
  reviewers: UserBrief[];
  references: {
    short: string;
    relative: string;
    full: string;
  };
  time_stats: {
    time_estimate: number;
    total_time_spent: number;
    human_time_estimate: string;
    human_total_time_spent: string;
  };
  web_url: string;
  work_in_progress: boolean;
  state: 'merged' | 'opened' | 'closed' | 'locked';
  title: string;
};
