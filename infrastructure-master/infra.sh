#!/bin/sh

STACK_NAME=$1
REGION=$2
PROFILE=$3

if [ "$#" -ne 3 ]
  then
    echo "One or more arguments missing"
    exit
fi

echo "Creating stack..."
STACK_ID=$( \
  aws cloudformation create-stack \
  --stack-name ${STACK_NAME} \
  --template-body file://networking.yaml \
  --capabilities CAPABILITY_IAM \
  --parameters file://parameters.json \
  --region ${REGION} \
  --profile ${PROFILE} \
  | jq -r .StackId \
)


echo "Waiting on ${STACK_ID} create completion..."
aws cloudformation wait stack-create-complete --stack-name ${STACK_ID} --region ${REGION} --profile ${PROFILE}
aws cloudformation describe-stacks --stack-name ${STACK_ID} --region ${REGION} --profile ${PROFILE} | jq .Stacks[0].Outputs