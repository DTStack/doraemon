#!/bin/bash
yarn
yarn build
cd ./dockerScripts
sh ./make.sh