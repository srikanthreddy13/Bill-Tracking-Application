#!/bin/bash
echo "#CSYE6225: start application pwd and move into nodeapp dir"
cd /home/ubuntu/webapp
sudo systemctl restart amazon-cloudwatch-agent
sudo forever start server.js