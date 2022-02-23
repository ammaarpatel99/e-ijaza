import {AriesCommandData} from '@types'

export class AriesCommand {
  constructor(private readonly data: Readonly<AriesCommandData>) { }

  get command() {
    return `PORTS="${this.data.inboundPort}:${this.data.inboundPort} ${this.data.adminPort}:${this.data.adminPort}" ` +
      `~/aries-cloudagent-python/scripts/run_docker start ` +
      `--admin 0.0.0.0 ${this.data.adminPort} `+
      `--admin-insecure-mode ` +
      `--inbound-transport http 0.0.0.0 ${this.data.inboundPort} ` +
      `--outbound-transport http ` +
      `--endpoint ${this.data.advertisedEndpoint} ` +
      `--genesis-url ${this.data.genesisUrl} ` +
      `--wallet-type indy ` +
      `--wallet-name ${this.data.walletName} ` +
      `--wallet-key ${this.data.walletKey} ` +
      `--public-invites ` +
      `--auto-accept-invites ` +
      `--auto-accept-requests ` +
      `--auto-respond-messages ` +
      `--auto-respond-credential-offer ` +
      `--auto-respond-credential-request ` +
      `--auto-verify-presentation ` +
      `--auto-store-credential ` +
      `--tails-server-base-url ${this.data.tailsServerUrl} ` +
      `--notify-revocation ` +
      `--monitor-revocation-notification ` +
      `--public-invites ` +
      `--auto-provision ` +
      `--auto-accept-intro-invitation-requests ` +
      `--webhook-url ${this.data.webhookURL} ` +
      `--auto-ping-connection ` +
      `--preserve-exchange-records`
  }
}
