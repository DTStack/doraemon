#!/bin/bash
export NODE_OPTIONS=--openssl-legacy-provider
yarn
yarn build
if [[ "$#" > 0 ]]; then
    yarn server:test
else 
    yarn stop
    yarn server
    yarn dingBot
fi
