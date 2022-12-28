#!/bin/bash
cd ./dockerScripts
sh ./docker_start.sh mysql $1
sh ./docker_start.sh web