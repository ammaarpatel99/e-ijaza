import 'zone.js/dist/zone-node';

import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { join } from 'path';

import { AppServerModule } from './src/main.server';
import { APP_BASE_HREF } from '@angular/common';
import { existsSync } from 'fs';

import * as bodyParser from 'body-parser'

import {router as apiRouter} from '@server/api'
import {router as webhookRouter} from '@server/webhook/router'
import * as path from "path";

import {spawn} from 'child_process'
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
    childProcess.stdout.on('data', data => {
      process.stdout.write(data)
    })
    childProcess.stderr.on('data', data => {
      process.stderr.write(data)
    })
  }
}


// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  server.use(bodyParser.json(), bodyParser.urlencoded({extended: true}))

  const distFolder = path.normalize(join(path.dirname(__filename), '../browser'))
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';

  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
  server.engine('html', ngExpressEngine({
    bootstrap: AppServerModule,
  }));

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // Express Rest API endpoints
  server.use('/api', apiRouter);
  server.use('/webhook', webhookRouter)

  // Serve static files from /browser
  server.get('*.*', express.static(distFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Universal engine
  server.get('*', (req, res) => {
    res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  app().listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });

  // runAries({
  //   advertisedEndpoint: `http://localhost:4000`,
  //   genesisUrl: 'http://host.docker.internal:9000/genesis',
  //   tailsServerUrl: 'http://host.docker.internal:6543',
  //   walletKey: 'walletKey',
  //   walletName: 'walletName'
  // })
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/main.server';
