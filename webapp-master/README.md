# webapp

## Pre-requisites
1) The application uses node and mysql, so to test the application locally both node and mysql should be configured. If you are using MYSQL version 8 , then you ned to configure the root password authentication to be able to make it work with node.

    ```
    ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'yourrootpass';
    ```

2) The tables required for the webapp will be automatically created except for the database which is a manual step.

3) The following environment variables should be set and stored in .env file at the root of the system. All the cloud variables are with respect to AWS.

    ```
    DB_HOST=""
    DB_USER=""
    DB_PASSWORD=""
    DB_NAME="csye6225"
    S3_BUCKET=""
    S3_BUCKET_URL=""
    AWS_PROFILE=""
    AWS_DEFAULT_ACL=""
    LOG_LEVEL=""
    ACCOUNT_ID=""
    SQS_QUEUE_NAME=""
    SNS_TOPIC_NAME=""
    ```

## Test and Build
1) cd to webapp folder and run npm install to install the necessary packages required to run the app.

2) The webapp uses jest framework for testing and run npm test for the test cases in the server.test.js file.

3) After each tests if you want to test it again, please make sure that the data in the tables is cleaned otherwise the tests will throw an error for few since it does not allow duplicate users creation.

4) To run circleci jobs locally, download the circleci binary brew install or sudo snap install and you can execute the below command

    ```circleci local execute --job pr_check``` .

5) This application uses a SSL certificate which have to be acuired from where the domain is registered.