#! /usr/bin/env bash
set -e

npm install interstellar
npm install

./node_modules/.bin/interstellar build --env=prd
