import fs from "fs";
import {OutgoingProofRequest} from "../src/types/interface-api";
import * as path from "path";
import {ApplicationWrapper} from "./application-wrapper";
import {User} from "./user";

interface Proof {
  name: string
  subject: string
  result: null | boolean
  proof: Proof[] | boolean | null
}

export class ProofResultLogger {
  private static _instance: ProofResultLogger | undefined
  static get instance() {
    if (!this._instance) this._instance = new ProofResultLogger()
    return this._instance
  }
  private constructor() { }

  private fileStream:fs.WriteStream | undefined
  private loggedProofs: Proof[] = []
  private applications: ApplicationWrapper[] = []

  instantiate(applications: ApplicationWrapper[]) {
    const logsDir = path.join('.', 'logs')
    const filepath = `${logsDir}/proof_results.txt`
    this.fileStream = fs.createWriteStream(filepath)
    this.applications = applications
  }

  logProof(proof: OutgoingProofRequest) {
    const _proof = this.processProof(proof)
    if (this.isLogged(_proof)) return
    this.loggedProofs.push(_proof)
    if (!this.fileStream) return;
    this.fileStream.write(
      JSON.stringify(_proof, null, 2) + `\n\n`
    )
  }

  private processProof(proof: OutgoingProofRequest): Proof {
    const name = this.applications
      .filter(app => app.did === proof.did)
      .map(app => app instanceof User ? app.rawName : app.name)
      .shift()!
    const subject = proof.subject
    const result = proof.result
    let _proof = typeof proof.proof === "boolean" || proof.proof === null ? proof.proof :
      proof.proof.map(proof => this.processProof(proof))
    return {name, subject, result, proof: _proof}
  }

  private isLogged(proof: Proof) {
    return !this.loggedProofs.every(_proof => !this.isEqualProofs(_proof, proof))
  }

  private isEqualProofs(proof1: Proof, proof2: Proof): boolean {
    if (proof1.name !== proof2.name || proof1.subject !== proof2.subject || proof1.result !== proof2.result) {
      return false
    }
    if (proof1.proof === proof2.proof) return true
    if (proof1.proof === null || proof2.proof === null ||
      typeof proof1.proof === "boolean" || typeof proof2.proof === "boolean" ||
      proof1.proof.length !== proof2.proof.length
    ) {
      return false
    }
    const proofComparator = (a: Proof, b: Proof) => {
      if (a.name < b.name) return -1
      else if (b.name < a.name) return 1
      else if (a.subject < b.subject) return -1
      else if (b.subject < a.subject) return 1
      else return 0
    }
    const proofs1 = proof1.proof.sort(proofComparator)
    const proofs2 = proof2.proof.sort(proofComparator)
    return proofs1.every((proof, index) => this.isEqualProofs(proof, proofs2[index]))
  }
}
