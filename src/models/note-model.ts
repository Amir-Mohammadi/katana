import { Issue } from './issue-model';
import { MergeRequest } from './merge-request-model';
import { UserBrief } from './user-brief-model';

export type Note = {
  id: 302;
  body: string;
  author: UserBrief;
  created_at: string;
  updated_at: string;
  system: boolean;
  noteable_id: number;
  noteable_type: 'Issue' | 'MergeRequest';
  noteable_iid: number;
  resolvable: boolean;
  confidential: boolean;
  issue?: Issue;
  merge_request?: MergeRequest;
};
