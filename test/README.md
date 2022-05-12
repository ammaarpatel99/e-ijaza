## Running Tests

Set up:
- Install NodeJS version 16.
- Run: `npm i`
- Start Development Environment.
  Run:
- `cd test`
- `npx ts-node ./run-tests.ts`

The logs will be in `./logs`, and the Docker containers created whilst running the tests will be removed and deleted before the script completes.

## Changing the number of nodes on the VON Network:

- Build the development environment.
- Edit the code in `/temp/von-network` based on `https://github.com/bcgov/von-network/blob/main/docs/AddNewNode.md`
- Rebuild the development environment.
- Run the tests.

## Change the test data

The test data must be a javascript object called `testData` in matching the interface in `./test-data-type.ts`.
Change the import of the testData in `./run-tests.ts` to match the data file.
Run the tests.
