import async from 'async';
import axios, { AxiosResponse } from 'axios';
import BuildUrl from 'build-url';
import { ConfigService } from '../services/config';
import Cli from './cli';
const throttle = require('throttled-queue')(10, 1000); // rate limit of 600 requests per minutes on Gitlab.com

type Task = { path: string; perPage: number; page: number };

const configService = new ConfigService();

class BaseService {
  url: string;
  token: string;
  private _perPage: number;
  private _parallel: number;

  constructor() {
    this.url = configService.url;
    this.token = configService.token;
    this._perPage = 100;
    this._parallel = 4;
  }

  public get(path: string, page = 1, perPage = this._perPage) {
    path += path.includes('?') ? '' : '?';
    path += `&page=${page}&per_page=${perPage}`;

    return new Promise<AxiosResponse>((resolve, reject) =>
      throttle(() => {
        axios
          .get(`${this.url}${path}`, {
            headers: {
              'PRIVATE-TOKEN': this.token,
            },
          })
          .then((response) => {
            resolve(response);
          })
          .catch((e) => reject(e));
      }),
    );
  }

  public async validateUsername(username: string): Promise<void> {
    const url = BuildUrl('users', {
      queryParams: {
        username: username,
      },
    });

    const user = await this.getAll(url);
    if (user.length === 0) Cli.error(`username "${username}" not found`);
  }

  // query the given path and paginate automatically and in parallel
  // through all available pages
  public getAll(
    path: string,
    perPage = this._perPage,
    runners = this._parallel,
  ) {
    return new Promise<Array<any>>((resolve, reject) => {
      let collect: any[] = [];

      this.get(path, 1, perPage)
        .then((response) => {
          (response.data as Array<any>).forEach((item) => collect.push(item));
          let pages = parseInt(response.headers['x-total-pages']);

          if (pages === 1) return resolve(collect);

          let tasks = BaseService.createGetTasks(path, pages, 2, perPage);
          this.getParallel(tasks, collect, runners)
            .then(() => {
              resolve(collect);
            })
            .catch((error) => reject(error));
        })
        .catch((err) => reject(err));
    });
  }

  // create a key representing a request
  private static createGetTasks(
    path: string,
    to: number,
    from = 2,
    perPage = 100,
  ) {
    let tasks: Task[] = [];

    for (let i = from; i <= to; i++) {
      tasks.push({ path, perPage, page: i });
    }

    return tasks;
  }

  // make multiple get requests by the given tasks and apply the
  // data to the given set
  private getParallel(
    tasks: Task[],
    collect: any[] = [],
    runners = this._parallel,
  ) {
    return this.parallel(
      tasks,
      (task, done) => {
        this.get(task.path, task.page, task.perPage)
          .then((response) => {
            (response.data as any[]).forEach((item) => collect.push(item));
            done();
          })
          .catch((error) => done(error));
      },
      runners,
    );
  }

  // perform the given worker function on the given tasks in parallel
  private parallel(
    tasks: Task[],
    worker: (task: Task, done: Function) => any,
    runners = this._parallel,
  ) {
    return new Promise<void>((resolve, reject) => {
      async.eachLimit(Array.from(tasks), runners, worker, (error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }
}

export default BaseService;
