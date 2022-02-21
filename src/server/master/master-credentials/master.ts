export class Master {
  private readonly subjectsToCredRef

  constructor(readonly did: string, subjects: [string, string][]) {
    this.subjectsToCredRef = new Map<string, string>(subjects)
  }
}
