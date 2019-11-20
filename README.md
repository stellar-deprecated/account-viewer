# account-viewer

A simple tool to view an account on the Stellar network and make transactions
from it.

## Developing

Because of the build tools used, this requires node 6 to build without errors.
The best way to handle this is with `nvm`
([install instructions](https://github.com/nvm-sh/nvm#installation-and-update)).
Since node 6 is end-of-life, it's best to install a modern LTS as the default
and only use 6 when necessary.

```sh
# The first version installed becomes the default
nvm install 10
nvm install 6
nvm use 6
```

Once you have that configured, install deps and then start
the project. Sass must be compiled targeting a specific node version, so if
you've installed deps while running a node version other than 6, you'll need to
`rm -rf node_modules`.

We use yarn for dependencies.

`yarn`

To start the app in development mode, which will watch for changes to files, rebuild, and reload the site automatically, run the start script.

`yarn start`

## Building for production

The production build produces static files that expect to be served from an `/account-viewer/` base name.

`yarn build`
