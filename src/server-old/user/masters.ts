import {MastersPublicSchema} from "@types";

export class Masters {
  private static _instance: Masters|undefined
  static get instance() {
    if (!this._instance) this._instance = new Masters()
    return this._instance
  }
  private constructor() { }

  private masters: MastersPublicSchema['credentials'] = {}

  setMasters(masters: MastersPublicSchema['credentials']) {
    this.masters = masters
  }
}
