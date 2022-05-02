import * as fs from "fs";

interface TimingRecord {
  start: number
  responded_to_subject_req: number
  received_creds_req: number
  responded_to_creds_req: number
  end: number
}

export class ProverTimingLogger {
  private static _instance: ProverTimingLogger | undefined
  static get instance() {
    if (!this._instance) this._instance = new ProverTimingLogger()
    return  this._instance
  }
  private constructor() {}

  private readonly timingRecords = new Map<string, TimingRecord>()

  private fileStream:fs.WriteStream | undefined

  private logTiming(timing: TimingRecord) {
    if (!this.fileStream) {
      const logsDir = process.env['LOGS_DIR']
      if (!logsDir) return
      const filepath = `${logsDir}/prover_timings.csv`
      this.fileStream = fs.createWriteStream(filepath)
      this.fileStream.write('start,responded_to_subject_req,received_creds_req,responded_to_creds_req,end')
    }
    this.fileStream.write(
      `\n${timing.start},${timing.responded_to_subject_req},${timing.received_creds_req},${timing.responded_to_creds_req},${timing.end}`
    )
  }

  receivedRequest(pres_ex_id: string) {
    this.timingRecords.set(pres_ex_id, {
      start: Date.now(),
      end: -1,
      received_creds_req: -1,
      responded_to_subject_req: -1,
      responded_to_creds_req: -1
    })
  }

  respondedToSubjectsRequest(pres_ex_id: string, conn_id: string) {
    const record = this.timingRecords.get(pres_ex_id)
    if (!record) {
      console.error(`timing record doesn't exist (1)`)
      return
    }
    record.responded_to_subject_req = Date.now()
    this.timingRecords.set(conn_id, record)
    this.timingRecords.delete(pres_ex_id)
  }

  receivedCredsRequest(conn_id: string) {
    const record = this.timingRecords.get(conn_id)
    if (!record) {
      console.error(`timing record doesn't exist (2)`)
      return
    }
    record.received_creds_req = Date.now()
    this.timingRecords.set(conn_id, record)
  }

  respondedToCredsRequest(conn_id: string) {
    const record = this.timingRecords.get(conn_id)
    if (!record) {
      console.error(`timing record doesn't exist (3)`)
      return
    }
    record.responded_to_creds_req = Date.now()
    this.timingRecords.set(conn_id, record)
  }

  completedRequest(conn_id: string) {
    const record = this.timingRecords.get(conn_id)
    if (!record) {
      console.error(`timing record doesn't exist (3)`)
      return
    }
    record.end = Date.now()
    this.logTiming(record)
    this.timingRecords.delete(conn_id)
  }
}
