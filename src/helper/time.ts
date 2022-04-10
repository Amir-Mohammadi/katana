export class Time {
  static toHumanReadable(input: number) {
    let baseTime = input;

    let hours = Math.floor(baseTime / 60 / 60);
    baseTime -= hours * 60 * 60;

    let minutes = Math.floor(baseTime / 60);
    baseTime -= minutes * 60;

    let seconds = baseTime;

    return `${hours}h ${minutes}m ${seconds}s`;
  }
}
