import dotenv from 'dotenv';
import { CleanedEnvAccessors, cleanEnv, email, json, str } from 'envalid';
import { join } from 'path';

interface IConfig {
  URL: string;
  TOKEN: string;
}

export class ConfigService {
  env: Readonly<IConfig & CleanedEnvAccessors>;

  constructor() {
    this.env = cleanEnv<IConfig>(process.env, {
      URL: str({ default: 'http://95.80.182.57:5003/api/v4/' }),
      TOKEN: str(),
    });
  }

  get url(): string {
    const url = this.env.URL;
    return url.endsWith('/') ? url : `${url}/`;
  }

  get token(): string {
    return this.env.TOKEN;
  }
}