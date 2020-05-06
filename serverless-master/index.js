const AWS = require('aws-sdk');
const ses = new AWS.SES();
const dynamoDB = new AWS.DynamoDB();
const route53 = new AWS.Route53();

AWS.config.update({ region: 'us-east-1' });

exports.handler = (event, context) => {
    const email = event.Records[0].Sns.MessageAttributes.email_address['Value'];
    const link = event.Records[0].Sns.MessageAttributes.Bills['Value'];

    const getItemObject = {
        TableName: 'csye6225-dynamo',
        Key: {
            'email_address': { S: email}
        }
    };

    dynamoDB.getItem(getItemObject, (err, data) => {
        if (data.Item === undefined || data.Item.ttl.N < Math.floor(Date.now() / 1000)) {
            const putItemObject = {
                TableName: 'csye6225-dynamo',
                Item: {
                    email_address: { S: email }, links: { S: link} ,
                    token: { S: context.awsRequestId },
                    ttl: { N: (Math.floor(Date.now() / 1000) + 3600).toString() }
                }
            };
            dynamoDB.putItem(putItemObject, () => {});
            route53.listHostedZones({}, (err, data) => {
                console.log("data--------hostedzones",data);
                let domainName = data.HostedZones[0].Name;
                domainName = domainName.substring(0, domainName.length - 1);
                const emailObject = {
                    Destination: {
                        ToAddresses: [email]
                    },
                    Message: {
                        Body: {
                            Text: {
                                Data: link.toString()
                            }
                        },
                        Subject: {
                            Data: "Link for the bills"
                        }
                    },
                    Source: "noreply@" + domainName
                };
                ses.sendEmail(emailObject, (err) => {console.log(err)})
            });
        }
    })
};