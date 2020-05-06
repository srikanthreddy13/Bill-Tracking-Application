# serverless

This repo helps you to deploy a lambda fucntion to AWS account. It is used to send a mail to the user who is requesting for the bills due in the next X days and is triggered when a message is piblished to a SNS topic. Uses a DynamoDB table to maintain the entries based on TTL and only sends out a mail if it is less than 60 minutes.

For the lambda function to send mails, you also need configure a SES domain and change it to a prod account so that you have required permissions to send mail to anyone.

To deploy lambda funstion, we first need to get infrastructure up with the help of infrastructure repo.

After the set up is done we can directly run the aws lambda update function command or run a circleci job to deploy our function.