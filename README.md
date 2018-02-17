# maconomy

Maconomy JavaScript library and a simple CLI.

## Installation
```bash
npm install -g maconomy-cli
```

will give you an executable called `maconomy` that can be used to interact with Maconomy. The JavaScript library is available on NPM as `maconomy`: `yarn add maconomy`.

## Usage
```bash
export MACONOMY_RPC_URL='<url>/DeltekTouch/Maconomy/Time_en_GB_MCS/maconomyshared/backend/RemoteCall.php'

maconomy login
maconomy --help
```

For command specific help you can use `maconomy command --help`.

First, you must set `MACONOMY_RPC_URL` as an environment variable holding the URL to your company's Maconomy installation. Then you can login using `macomony login`. It will store the session ID in a file in your home directory for further use. When you have obtained a session you can log hours using `maconomy add` or view already logged hours using `macomony show`. See `maconomy --help` for all commands.

## JavaScript Usage
Currently the JavaScript library is basically a low-level 1-to-1 mapping to the Maconomy RPC scheme. This might change in future version by adding more specialized methods and combinations of methods that are now implemented in the CLI application code.

```js
import createClient from 'maconomy';

const api = createClient({
  rpcUrl: process.env.MACONOMY_RPC_URL
});
```

See the code for updated documentation of the available methods and their parameters.
