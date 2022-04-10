import { UserState } from './user-model';

export type UserBrief = {
  id: number;
  name: string;
  username: string;
  state: UserState;
  avatar_url: string;
  web_url: string;
};
