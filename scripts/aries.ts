const spawn = require('child_process').spawn


function runAries(data: {
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
    '--public-invites ' +
    '--auto-provision ' +
    '--auto-accept-intro-invitation-requests ' +
    '--webhook-url http://localhost:4000/webhook ' +
    '--auto-ping-connection ' +
    '--preserve-exchange-records ' +
    `>${logsDir}/aries.log 2>${logsDir}/aries.error.log`])
  if (! logsDir) {
    childProcess.stdout.on('data', (data: any) => {
      process.stdout.write(data)
    })
    childProcess.stderr.on('data', (data: any) => {
      process.stderr.write(data)
    })
  }
}

runAries({
  advertisedEndpoint: 'http://host.docker.internal:4001',
  genesisUrl: 'http://host.docker.internal:9000/genesis',
  tailsServerUrl: `http://host.docker.internal:6543`,
  walletKey: 'walletKey',
  walletName: 'walletName'
})
