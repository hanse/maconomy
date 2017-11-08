# maconomy

Maconomy JavaScript library and a simple CLI.

## Installation
```bash
npm install -g maconomy
```

## Usage
```bash
export MACONOMY_RPC_URL='<url>/DeltekTouch/Maconomy/Time_en_GB_MCS/maconomyshared/backend/RemoteCall.php'

maconomy login
maconomy --help
```

First, you must set `MACONOMY_RPC_URL` as an environment variable holding the URL to your company's Maconomy installation. Then you can login using `macomony login`. It will store the session ID in a file in your home directory for further use. When you have obtained a session you can log hours using `maconomy add` or view already logged hours using `macomony show`. See `maconomy --help` for all commands.
