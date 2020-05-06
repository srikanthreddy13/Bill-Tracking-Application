#!/bin/bash

# update the permission and ownership of WAR file in the tomcat webapps directory
echo "#CSYE6225: doing after install"
pwd
sudo chown ubuntu:ubuntu /home/ubuntu/webapp
chmod 777 /home/ubuntu/webapp
cd /home/ubuntu/webapp
sudo cp -rf amazon-cloudwatch-config.json /opt/amazon-cloudwatch-config.json
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/home/ubuntu/webapp/amazon-cloudwatch-config.json -s
sudo chmod 777 /home/ubuntu/webaapp/logs
sudo chmod 666 /home/ubuntu/webapp/logs/webapp.log
sudo npm install
sudo npm install forever -g