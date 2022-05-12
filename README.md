# EIjaza

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 13.2.0.

## Application

Build: `./scripts/manage app build`
Start: `./scripts/manage app start <web-port> <aries-port> <docker-container name>`
Stop: `./scripts/manage app stop <docker-container-name>`
Remove: `./scripts/manage app remove <docker-container-name>`

Rebuild on change: `./scripts/manage app rebuild`

## Development Environment

Build:
- `./scripts/manage net build`
- `./scripts/manage tails build`
Start:
- `./scripts/manage net start`
- `./scripts/manage tails start`
Stop:
- `./scripts/manage net stop`
- `./scripts/manage tails stop`
Remove:
- `./scripts/manage net remove`
- `./scripts/manage tails remove`

The VON Network runs on `http://localhost:9000` with the Genesis URL at `http://localhost:9000/genesis`.
The Indy Tails Server runs on `http://localhost:6543`.
In initialisation of Applications use `host.docker.internal` instead of `localhost` to allow the contains to access each other.

## Development Application

Set up:
- Install NodeJS version 16.
- Run: `npm i`
Build: `./scripts/manage app build`
Start: `./scripts/manage app start <web-port> <aries-port> <docker-container name> --dev <aries-admin-page-port>`

The Docker image does not need rebuilding when the source code changes, unless the Dockerfile changes.

## Running Tests

Set up:
- Install NodeJS version 16.
- Run: `npm i`
- Start Development Environment.
Run:
- `cd test`
- `npx ts-node ./run-tests.ts`
More information in `./test/README.md`
