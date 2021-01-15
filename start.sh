#!/bin/bash
yarn
yarn build
if [[ "$#" > 0 ]]; then
    yarn server:test
else 
    yarn stop
    yarn server
fi
