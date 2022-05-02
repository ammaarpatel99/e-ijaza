import * as fs from "fs";

export class VerifierTimingLogger {
  private static _instance: VerifierTimingLogger | undefined
  static get instance() {
    if (!this._instance) this._instance = new VerifierTimingLogger()
    return  this._instance
  }
  private constructor() {}

  private readonly timingRecords = new Map<string, number>()

  private fileStream:fs.WriteStream | undefined

  private logTiming(start: number, end: number) {
    if (!this.fileStream) {
      const logsDir = process.env['LOGS_DIR']
      if (!logsDir) return
      const filepath = `${logsDir}/verifier_timings.csv`
      this.fileStream = fs.createWriteStream(filepath)
      this.fileStream.write('start,end')
    }
    this.fileStream.write(
      `${start},${end}`
    )
  }

  startRequest(conn_id: string) {
    this.timingRecords.set(conn_id, Date.now())
  }

  endRequest(conn_id: string) {
    const end = Date.now()
    const start = this.timingRecords.get(conn_id)
    if (!start) {
      console.error(`ending verifier proof request but in the log it never started`)
      return
    }
    this.logTiming(start, end)
    this.timingRecords.delete(conn_id)
  }
}
