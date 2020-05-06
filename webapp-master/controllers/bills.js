const mysqlConnection = require("../config/connection");
const Bill = require("../models/bills");
const User = require("../models/user");
const uuidv4 = require('uuid/v4');
const statsd = require('../statsd-client');
const logger = require('../winston');
const sequelize = require('sequelize');
const Op = sequelize.Op;

// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
// Set the region we will be using
AWS.config.update({region: 'us-east-1'});

// Create SQS service client
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

// Using bcrypt to hash the password and store in the databse
const bcrypt = require("bcryptjs");
const saltRounds = 10;

// Post a bill for a user
exports.post_bills = async (req, res) => {

    var apiTimer = new Date();
    statsd.increment("post bill details api called");
    const bill = req.body;

    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''   // split the base64 code to get username and password
    const strauth = new Buffer(b64auth, 'base64').toString()                // convert the base64 encode to string
    const splitIndex = strauth.indexOf(':')                                 // split the index to get emailAdress and password
    const email_address = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)

    if (!email_address || !password) {
        logger.error('Post bill: Please provide email address or password');
        return res.status(401).send({ error: true, message: 'Please provide email address or password' });
    }

    var queryTimer = new Date();
    User.findOne({
        where: {
            email_address: email_address
        }
    }).then((result) => {
        if (result.length == 0) { // false if author already exists and was not created.
            statsd.timing("post bill api.timer", apiTimer);
            statsd.timing("post bill api.timer", queryTimer);
            logger.error('Post bill: Email does not exists');
            return res.status(400).send({ message: "Email does not exists" })
        }

        const pass_result = bcrypt.compareSync(password, result['password']);               // compare the hashed password with password provided
        if (!pass_result) {
            logger.error('Post bill: Password not valid!');
            return res.status(401).send({ message: 'Password not valid!' });
        }

        Bill.create({
            id: uuidv4(),
            created_ts: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
            updated_ts: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
            owner_id: result['id'],
            vendor: bill.vendor,
            bill_date: bill.bill_date,
            due_date: bill.due_date,
            amount_due: bill.amount_due,
            categories: bill.categories.toString(),
            paymentStatus: bill.paymentStatus,
            attachment: ""
        }).then((result) => {
            statsd.timing("post bill api.timer", apiTimer);
            statsd.timing("post bill query.timer", queryTimer);
            logger.info(`Post bill: bill ${result['id']} created`);
            res.status(201).send({ id: result['id'], created_ts: result['createdAt'], updated_ts: result['updatedAt'], owner_id: result['owner_id'], vendor: result['vendor'], bill_date: result['bill_date'], due_date: result['due_date'], amount_date: result['amount_due'], categories: result['categories'], paymentStatus: result['paymentStatus'], attachment: result['attachment'] })
        })
            .catch(err => { logger.error(err); return res.status(400).send({ message: 'Error creating bill' }) })


    }).catch(err => { logger.error(err); return res.status(400).send({ message: 'Email does not exists' }) })

};

// Fetch a bill based on the bill ID and the user
exports.get_bills = (req, res) => {

    var apiTimer = new Date();
    statsd.increment("get bill details by ID api called");
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''   // split the base64 code to get username and password
    const strauth = new Buffer(b64auth, 'base64').toString()                // convert the base64 encode to string
    const splitIndex = strauth.indexOf(':')                                 // split the index to get emailAdress and password
    const email_address = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)

    if (!email_address || !password) {
        logger.error('Get bill(ID): Please provide email address or pssword');
        return res.status(401).send({ error: true, message: 'Please provide email address or pssword' });
    }

    var queryTimer = new Date();
    User.findOne({
        where: {
            email_address: email_address
        }
    }).then((result) => {
        if (result.length == 0) { // false if author already exists and was not created.
            statsd.timing("get bill by ID api.timer", apiTimer);
            statsd.timing("get bill by ID query.timer", queryTimer);
            logger.error('Get bill(ID): Email does not exists');
            return res.status(400).send({ message: "Email does not exists" })
        }

        const pass_result = bcrypt.compareSync(password, result['password']);               // compare the hashed password with password provided
        if (!pass_result) {
            statsd.timing("get bill by ID api.timer", apiTimer);
            statsd.timing("get bill by ID query.timer", queryTimer);
            logger.error('Get bill(ID): Password not valid!');
            return res.status(401).send({ message: 'Password not valid!' });
        }

        const user_id = result['id'];

        Bill.findOne({
            where: {
                id: req.params.billId
            }
        }).then((result) => {
            if (result.lenth == 0) {
                statsd.timing("get bill by ID api.timer", apiTimer);
                statsd.timing("get bill by ID query.timer", queryTimer);
                logger.error('Get bill(ID): Bill not found');
                return res.status(404).send({ message: 'Bill not found' })
            }

            Bill.findOne({
                where: {
                    id: req.params.billId,
                    owner_id: user_id
                }
            }).then((result) => {
                statsd.timing("get bill by ID api.timer", apiTimer);
                statsd.timing("get bill by ID query.timer", queryTimer);
                logger.info(`Get bill(ID): get ${result['id']} success`);
                res.status(200).send({ id: result['id'], created_ts: result['createdAt'], updated_ts: result['updatedAt'], owner_id: result['owner_id'], vendor: result['vendor'], bill_date: result['bill_date'], due_date: result['due_date'], amount_date: result['amount_due'], categories: result['categories'], paymentStatus: result['paymentStatus'], attachment: result['attachment'] })
            })
                .catch(err => { return res.status(401).send({ message: 'Bill cannot be seen' }) })
        })
            .catch(err => { return res.status(404).send({ message: 'Bill not found' }) })
    })
        .catch(err => { return res.status(400).send({ message: 'Email does not exists' }) })

};

// Get all bills in the table for that user
exports.get_all_bills = (req, res) => {

    var apiTimer = new Date();
    statsd.increment("get bill details api called");
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''   // split the base64 code to get username and password
    const strauth = new Buffer(b64auth, 'base64').toString()                // convert the base64 encode to string
    const splitIndex = strauth.indexOf(':')                                 // split the index to get emailAdress and password
    const email_address = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)

    if (!email_address || !password) {
        statsd.timing("get all bills api.timer", apiTimer);
        logger.error('Get bills: Please provide email address or pssword');
        return res.status(401).send({ error: true, message: 'Please provide email address or pssword' });
    }


    var queryTimer = new Date();
    User.findOne({
        where: {
            email_address: email_address
        }
    }).then((user_result) => {
        if (user_result.length == 0) { // false if author already exists and was not created.
            statsd.timing("get all bills api.timer", apiTimer);
            statsd.timing("get all bills query.timer", queryTimer);
            logger.error('Get bills: Email does not exists');
            return res.status(400).send({ message: "Email does not exists" })
        }

        const user_id = user_result['id'];

        const pass_result = bcrypt.compareSync(password, user_result['password']);               // compare the hashed password with password provided
        if (!pass_result) {
            statsd.timing("get all bills api.timer", apiTimer);
            statsd.timing("get all bills query.timer", queryTimer);
            logger.error('Get bills: Password not valid!');
            return res.status(401).send({ message: 'Password not valid!' });
        }

        Bill.findAll({
            where: {
                owner_id: user_id
            }
        }).then((results) => {

            if (results.lenth == 0) {
                statsd.timing("get all bills api.timer", apiTimer);
                statsd.timing("get all bills query.timer", queryTimer);
                logger.error('Get bills: Bill not found');
                return res.status(404).send({ message: 'Bill not found' })
            }
            statsd.timing("get all bills api.timer", apiTimer);
            statsd.timing("get all bills query.timer", queryTimer);
            logger.info('Get bills for a user success');
            res.status(200).send(results);

        })
            .catch(err => { logger.error(err); return res.status(404).send({ message: 'Bill not found' }) })
    })
        .catch(err => { return res.status(400).send({ message: 'Email does not exists' }) })
};

// Get all bills in the table for that user
exports.get_all_bills_due = (req, res) => {

    var apiTimer = new Date();
    statsd.increment("get bill details api called");

    // get the current date 
    let ts = Date.now();

    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let year = date_ob.getFullYear();

    let current_date = year + "-" + month + "-" + date;

    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''   // split the base64 code to get username and password
    const strauth = new Buffer(b64auth, 'base64').toString()                // convert the base64 encode to string
    const splitIndex = strauth.indexOf(':')                                 // split the index to get emailAdress and password
    const email_address = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)

    if (!email_address || !password) {
        statsd.timing("get all bills api.timer", apiTimer);
        logger.error('Get bills: Please provide email address or pssword');
        return res.status(401).send({ error: true, message: 'Please provide email address or pssword' });
    }


    var queryTimer = new Date();
    User.findOne({
        where: {
            email_address: email_address
        }
    }).then((user_result) => {
        if (user_result.length == 0) { // false if author already exists and was not created.
            statsd.timing("get all bills api.timer", apiTimer);
            statsd.timing("get all bills query.timer", queryTimer);
            logger.error('Get bills: Email does not exists');
            return res.status(400).send({ message: "Email does not exists" })
        }

        const user_id = user_result['id'];

        const pass_result = bcrypt.compareSync(password, user_result['password']);               // compare the hashed password with password provided
        if (!pass_result) {
            statsd.timing("get all bills api.timer", apiTimer);
            statsd.timing("get all bills query.timer", queryTimer);
            logger.error('Get bills: Password not valid!');
            return res.status(401).send({ message: 'Password not valid!' });
        }

        Bill.findAll({
            where: {
                [Op.and]: [
                    sequelize.where(sequelize.fn('datediff', sequelize.col('due_date'), sequelize.fn("NOW")), {
                        [Op.lte]: req.params.days // OR [Op.gt] : 5
                    }),
                    { owner_id: user_id }
                ]
            }
        }).then((results) => {

            if (results.lenth == 0) {
                statsd.timing("get all bills api.timer", apiTimer);
                statsd.timing("get all bills query.timer", queryTimer);
                logger.error('Get bills: Bill not found');
                return res.status(404).send({ message: 'Bill not found' })
            }
            statsd.timing("get all bills api.timer", apiTimer);
            statsd.timing("get all bills query.timer", queryTimer);
            logger.info('Get bills for a user success');

            var links = `The links for bills due in next ${req.params.days} - \n`;
            for(let i=0; i<results.length;i++){
                let link = req.protocol + '://' + req.get('host') + '/v2/bill/' + results[i]['dataValues']['id'] + '\n';
                links += link; 
            }

            // Setup the sendMessage parameter object   
            const params = {
                MessageAttributes: {
                    "email_address": {
                      DataType: "String",
                      StringValue: email_address
                    },
                    "Bills": {
                      DataType: "String",
                      StringValue: links
                    }
                  },
                MessageBody: `The link for bills due in the next ${req.params.days} days`,
                QueueUrl: `https://sqs.us-east-1.amazonaws.com/${process.env.ACCOUNT_ID}/${process.env.SQS_QUEUE_NAME}`
            };
            sqs.sendMessage(params, (err, data) => {
                if (err) {
                    logger.error(err);
                } else {
                    logger.info(`Successfully added message ${data.MessageId}`)
                }
            });

            res.status(200).send(results);

        })
            .catch(err => { logger.error(err); return res.status(404).send({ message: 'Bill not found' }) })
    })
        .catch(err => { logger.error(err); return res.status(400).send({ message: 'Email does not exists' }) })
};


// Update a bill based on the bill ID and user
exports.update_bill = (req, res) => {

    var apiTimer = new Date();
    statsd.increment("update bill details api called");
    const bill = req.body;

    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''   // split the base64 code to get username and password
    const strauth = new Buffer(b64auth, 'base64').toString()                // convert the base64 encode to string
    const splitIndex = strauth.indexOf(':')                                 // split the index to get emailAdress and password
    const email_address = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)

    if (!email_address || !password) {
        statsd.timing("update bill api.timer", apiTimer);
        logger.error('Update bill: Please provide email address or password');
        return res.status(401).send({ error: true, message: 'Please provide email address or password' });
    }

    if (!bill.vendor || !bill.due_date || !bill.bill_date || !bill.categories || !bill.paymentStatus) {
        statsd.timing("update bill api.timer", apiTimer);
        return res.status(400).send({ message: 'One or more fileds are not provided for update' });
    }

    var queryTimer = new Date();
    User.findOne({
        where: {
            email_address: email_address
        }
    }).then((result) => {
        if (result.length == 0) { // false if author already exists and was not created.
            statsd.timing("update bill api.timer", apiTimer);
            statsd.timing("update bill query.timer", queryTimer);
            logger.error('Update bill: Email does not exists');
            return res.status(400).send({ message: "Email does not exists" })
        }

        const pass_result = bcrypt.compareSync(password, result['password']);               // compare the hashed password with password provided
        if (!pass_result) {
            statsd.timing("update bill api.timer", apiTimer);
            statsd.timing("update bill query.timer", queryTimer);
            logger.error('Update bill: Password not valid!');
            return res.status(401).send({ message: 'Password not valid!' });
        }
        const user_id = result['id'];

        Bill.findOne({
            where: {
                id: req.params.billId
            }
        }).then((result) => {

            if (result.lenth == 0) {
                statsd.timing("update bill api.timer", apiTimer);
                statsd.timing("update bill query.timer", queryTimer);
                logger.error('Update bill: Bill not found');
                return res.status(404).send({ message: 'Bill not found' })
            }

            Bill.update({
                updated_ts: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
                vendor: bill.vendor,
                bill_date: bill.bill_date,
                due_date: bill.due_date,
                amount_due: bill.amount_due,
                categories: bill.categories.toString(),
                paymentStatus: bill.paymentStatus

            }, {
                where: {
                    id: req.params.billId,
                    owner_id: user_id
                }
            }).then((result) => {
                if (result[0] == 0) {
                    statsd.timing("update bill api.timer", apiTimer);
                    statsd.timing("update bill api.timer", queryTimer);
                    logger.error('Update bill: Bill cannot be updated');
                    return res.status(401).send({ message: 'Bill cannot be updated' })
                }

                Bill.findOne({
                    where: {
                        id: req.params.billId,
                        owner_id: user_id
                    }
                }).then((result) => {
                    statsd.timing("update bill api.timer", apiTimer);
                    statsd.timing("update bill query.timer", queryTimer);
                    logger.info('Update bill success');
                    res.status(200).send(result)
                })
            })
                .catch(err => { return res.status(400).send({ message: 'Error updating bill' }) })
        })
            .catch(err => { return res.status(404).send({ message: 'Bill not found' }) })
    })
        .catch(err => { return res.status(400).send({ message: 'Email does not exists' }) })
};


// Delete a bill based on the bill ID and user
exports.delete_bill = (req, res) => {

    var apiTimer = new Date();
    statsd.increment("delete bill details api called");
    const bill = req.body;

    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''   // split the base64 code to get username and password
    const strauth = new Buffer(b64auth, 'base64').toString()                // convert the base64 encode to string
    const splitIndex = strauth.indexOf(':')                                 // split the index to get emailAdress and password
    const email_address = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)

    if (!email_address || !password) {
        statsd.timing("delete bill api.timer", apiTimer);
        logger.error('Delete bill: Please provide email address or pssword');
        return res.status(401).send({ error: true, message: 'Please provide email address or pssword' });
    }

    var queryTimer = new Date();
    User.findOne({
        where: {
            email_address: email_address
        }
    }).then((result) => {
        if (result.length == 0) { // false if author already exists and was not created.
            statsd.timing("delete bill api.timer", apiTimer);
            statsd.timing("delete bill query.timer", queryTimer);
            logger.error('Delete bill: Email does not exists');
            return res.status(400).send({ message: "Email does not exists" })
        }

        const pass_result = bcrypt.compareSync(password, result['password']);               // compare the hashed password with password provided
        if (!pass_result) {
            statsd.timing("delete bill api.timer", apiTimer);
            statsd.timing("delete bill query.timer", queryTimer);
            logger.error('Delete bill: Password not valid!');
            return res.status(401).send({ message: 'Password not valid!' });
        }
        const user_id = result['id'];

        Bill.findOne({
            where: {
                id: req.params.billId
            }
        }).then((result) => {

            if (result.lenth == 0) {
                statsd.timing("delete bill api.timer", apiTimer);
                statsd.timing("delete bill query.timer", queryTimer);
                logger.error('Delete bill: Bill not found');
                return res.status(404).send({ message: 'Bill not found' })
            }

            Bill.destroy({
                where: {
                    id: req.params.billId,
                    owner_id: user_id
                }

            }).then((result) => {
                if (result == 0) {
                    statsd.timing("delete bill api.timer", apiTimer);
                    statsd.timing("delete bill query.timer", queryTimer);
                    logger.error('Delete bill: Bill cannot be deleted');
                    return res.status(401).send({ message: 'Bill cannot be deleted' })
                }

                statsd.timing("delete bill api.timer", apiTimer);
                statsd.timing("delete bill query.timer", queryTimer);
                logger.info('Delete bill successful');
                return res.status(204).send()
            })
                .catch(err => { logger.error(err); return res.status(400).send({ message: 'Error deleting bill' }) })
        })
            .catch(err => { return res.status(404).send({ message: 'Bill not found' }) })
    })
        .catch(err => { return res.status(400).send({ message: 'Email does not exists' }) })
};