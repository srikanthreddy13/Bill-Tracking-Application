const { Consumer } = require('sqs-consumer');
const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const logger = require('../winston');

const consumer = Consumer.create({
    queueUrl: `https://sqs.us-east-1.amazonaws.com/${process.env.ACCOUNT_ID}/${process.env.SQS_QUEUE_NAME}`,
    messageAttributeNames: ['email_address', 'Bills'],
    handleMessage: async (message) => {
        // Create publish parameters
        var params = {
            Message: message.Body + ' for user ' + message.MessageAttributes['email_address'].StringValue + '. Link to the bills ' + message.MessageAttributes['Bills'].StringValue, /* required */
            MessageAttributes: {
                "email_address": {
                    DataType: "String",
                    StringValue: message.MessageAttributes['email_address'].StringValue
                },
                "Bills": {
                    DataType: "String",
                    StringValue: message.MessageAttributes['Bills'].StringValue
                }
            },
            TopicArn: `arn:aws:sns:us-east-1:${process.env.ACCOUNT_ID}:${process.env.SNS_TOPIC_NAME}`
        };

        // Create promise and SNS service object
        var publishTextPromise = new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();

        // Handle promise's fulfilled/rejected states
        publishTextPromise.then(
            function (data) {
                logger.info(`Message ${params.Message} sent to the topic ${params.TopicArn}`);
                logger.info(`MessageID is ${data.MessageId}`);
            }).catch(
                function (err) {
                    logger.error(err);
                }
            );
    },
    batchSize: 3,
    sqs: new AWS.SQS()
});

consumer.on('error', (err) => {
    console.error(err.message);
});

consumer.on('processing_error', (err) => {
    console.error(err.message);
});

consumer.on('timeout_error', (err) => {
    console.error(err.message);
});

consumer.start();