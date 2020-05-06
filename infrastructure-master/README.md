## Cloud-Formation

This repo helps you deploy the resources stack on AWS and create them. For this we need to configure AWS cli to run the cloudformation template from the terminal.

1) First you need to download the aws cli. More info - https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html .

2) Configure different accounts using ```aws configure``` command and set up the access and secret keys. Info - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html .

    ```example : aws configure --profile profile_name```

3) The template in application.yaml file helps you create a VPC, 3 subnets, route table, EC2 Auto scaling groups, Load balancer, Code deployment group etc which is required to run the webapp. To deploy the VPC stack run the following command and replace the variables with your input.


    ``` 
    aws cloudformation create-stack   --stack-name csy26225-demo  --parameters file://parameters.json   --template-body file://application.yaml --capabilities CAPABILITY_NAMED_IAM  --profile profile_name 
    ```

A certificate has to be uploaded inorder for HTTPS connection and command is as follows:
```
aws acm import-certificate --certificate file://{certificat}.crt --private-key file://{your-privatekey}.pem --certificate-chain file://{ca-bundle-name}.ca-bundle --profile {profile-name}
```
    