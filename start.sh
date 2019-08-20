#!/bin/bash
git pull
yarn
yarn build
yarn stop
yarn server