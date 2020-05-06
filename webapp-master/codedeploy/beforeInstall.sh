#!/bin/bash

cd /home/ubuntu/webapp
sudo forever stop server.js
npm cache clean --force
sudo rm -rf node_modules/
sudo rm -rf package-lock.json