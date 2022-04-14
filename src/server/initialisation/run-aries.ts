import {spawn} from 'child_process'


export function runAries(data: {
  advertisedEndpoint: string,
  genesisUrl: string,
  walletName: string,
  walletKey: string,
  tailsServerUrl: string
}) {
  const logsDir = process.env['LOGS_DIR']
  const childProcess = spawn('/bin/bash',
    ['-c', 'aca-py start '  +
    '--admin 0.0.0.0 4002 ' +
    '--admin-insecure-mode ' +
    '--inbound-transport http 0.0.0.0 4001 ' +
    '--outbound-transport http ' +
    `--endpoint ${data.advertisedEndpoint} ` +
    `--genesis-url ${data.genesisUrl} ` +
    '--wallet-type indy ' +
    `--wallet-name ${data.walletName} ` +
    `--wallet-key ${data.walletKey} ` +
    '--public-invites ' +
    '--auto-accept-invites ' +
    '--auto-accept-requests ' +
    '--auto-respond-messages ' +
    '--auto-respond-credential-offer ' +
    '--auto-respond-credential-request ' +
    '--auto-respond-presentation-proposal ' +
    '--auto-verify-presentation ' +
    '--auto-store-credential ' +
    `--tails-server-base-url ${data.tailsServerUrl} ` +
    '--notify-revocation ' +
    '--monitor-revocation-notification ' +
    '--auto-provision ' +
    '--webhook-url http://localhost:4000/webhook ' +
    '--auto-ping-connection ' +
    '--preserve-exchange-records ' +
    `>${logsDir}/aries.log 2>${logsDir}/aries.error.log`])
  if (! logsDir) {
    childProcess.stdout.on('data', data => {
      process.stdout.write(data)
    })
    childProcess.stderr.on('data', data => {
      process.stderr.write(data)
    })
  }
}
