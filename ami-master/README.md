# ami

This repo helps in building a custom AMI image on AWS using Hashicorp Packer, which is an  open source tool for creating identical machine images for multiple platforms in a default subnet provided by AWS.

Need to download the packer binary onto your system to build images. More info - https://packer.io/intro/getting-started/install.html . 

We are using a pre-defined ami image present in AWS register Ubuntu 18 LTS (AMI ID ami-07ebfd5b3428b6f4d) to build our custom image and then sharing it with other accounts.

Should have a aws account with access to create secret and access keys to build images.

The image is built using the below command using pre-defined variables
```
packer build \
-var "aws_access_key=$AWS_ACCESS_KEY_ID" \
-var "aws_secret_key=$AWS_SECRET_ACCESS_KEY" \
-var "aws_region=us-east-1" \
-var "ami_users=$AMI_USERS" \
-var "source_ami=$SOURCE_AMI" \
ubuntu-ami.json
```

Where AMI_USERS - are the account numbers to which you want to share your custom image and SOURCE_AMI - is the source image ID which is your base.

