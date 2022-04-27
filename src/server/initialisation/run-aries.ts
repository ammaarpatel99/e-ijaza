import {spawn} from 'child_process'


export function runAries(data: {
  advertisedEndpoint: string,
  genesisUrl: string,
  walletName: string,
  walletKey: string,
  tailsServerUrl: string
}) {
  const logsDir = process.env['LOGS_DIR']
  const childProcess = spawn('/bin/bash', [
    '-c', 'aca-py start '  +
    '--admin 0.0.0.0 4002 ' +
    '--admin-insecure-mode ' +
    '--webhook-url http://localhost:4000/webhook ' +

    '--auto-accept-invites ' +
    '--auto-accept-requests ' +
    '--auto-respond-messages ' +
    // '--auto-respond-credential-proposal ' +
    '--auto-respond-credential-offer ' +
    '--auto-respond-credential-request ' +
    '--auto-respond-presentation-proposal ' +
    '--auto-respond-presentation-request ' +
    '--auto-store-credential ' +
    '--auto-verify-presentation ' +

    `--endpoint ${data.advertisedEndpoint} ` +

    `--tails-server-base-url ${data.tailsServerUrl} ` +
    '--notify-revocation ' +
    '--monitor-revocation-notification ' +

    `--genesis-url ${data.genesisUrl} ` +

    // (logsDir ? `--log-file ${logsDir}/aries.log ` : '') +
    // `--log-level debug ` +
    // `--timing ` +
    // (logsDir ? `--timing-log ${logsDir}/aries.timing.log ` : '') +
    // `--trace ` +
    '--preserve-exchange-records ' +

    '--auto-ping-connection ' +
    '--public-invites ' +

    '--auto-provision ' +

    '--inbound-transport http 0.0.0.0 4001 ' +
    '--outbound-transport http ' +

    `--wallet-key ${data.walletKey} ` +
    `--wallet-name ${data.walletName} ` +
    '--wallet-type indy ' +
    (logsDir ? `>${logsDir}/aries.log 2>${logsDir}/aries.error.log` : '')
  ])
  if (!logsDir) {
    childProcess.stdout.on('data', data => {
      process.stdout.write(data)
    })
    childProcess.stderr.on('data', data => {
      process.stderr.write(data)
    })
  }
}
