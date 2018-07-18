#! /usr/bin/env bash
set -e

npm install yarn
./node_modules/.bin/yarn install
npm install interstellar
./node_modules/.bin/interstellar build --env=prd
