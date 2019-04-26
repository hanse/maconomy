# maconomy

> Maconomy JavaScript library and a simple CLI.

![Screencast](https://i.imgur.com/VlwAbhd.gif)

## Installation

```bash
npm install -g maconomy-cli
```

will give you an executable called `maconomy` that can be used to interact with Maconomy. The JavaScript library is available on NPM as `maconomy`: `yarn add maconomy`.

Make sure you use a recent version of Node.js (8 or later).

## Usage

```bash
export MACONOMY_RPC_URL='<url>/DeltekTouch/Maconomy/Time_en_GB_MCS/maconomyshared/backend/RemoteCall.php'

maconomy login
maconomy --help
```

For command specific help you can use `maconomy command --help`.

First, you must set `MACONOMY_RPC_URL` as an environment variable holding the URL to your company's Maconomy installation. Then you can login using `macomony login`. It will store the session ID in a file in your home directory for further use. When you have obtained a session you can log hours using `maconomy add` or view already logged hours using `macomony show`. See `maconomy --help` for all commands.

## Importing CSV

The easiest way to use this to record hours is to use the CSV import command, which reads CSV formatted files from stdin and copies the lines to Maconomy.

```
maconomy import < timesheet-05.csv
```

This will by default use the first day of the current week as the base, but it respects the `--start-date` flag if you're recording hours for previous weeks. There is an example of an expected CSV file layout in the [examples folder](https://github.com/hanse/maconomy/blob/master/packages/maconomy-cli/examples/timesheet.csv).

It is wise to login to Maconomy Web UI and verify that the import went well before submitting the week :-)

## JavaScript Usage

Currently the JavaScript library is basically a low-level 1-to-1 mapping to the Maconomy RPC scheme. This might change in future version by adding more specialized methods and combinations of methods that are now implemented in the CLI application code.

```js
import createClient from 'maconomy';

const api = createClient({
  rpcUrl: process.env.MACONOMY_RPC_URL
});
```

See the code for updated documentation of the available methods and their parameters.
