import { Url } from 'url';

export type UserState = 'active' | 'blocked';

export type User = {
  id: number;
  username: string;
  email: string;
  name: string;
  state: UserState;
  avatar_url: Url;
  web_url: Url;
  created_at: string;
  bio: string;
  bio_html: string;
  public_email: string;
};
