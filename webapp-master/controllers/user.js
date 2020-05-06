const mysqlConnection = require("../config/connection");
const User = require("../models/user");
const uuidv4 = require('uuid/v4');
const statsd = require('../statsd-client');
const logger = require('../winston');
const joi = require("joi");

// Using bcrypt to hash the password and store in the databse
const bcrypt = require("bcryptjs");
const saltRounds = 10;

// Export Get user request
exports.get_user = (req, res) => {

    var apiTimer = new Date();
    statsd.increment("get user details api called");
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''   // split the base64 code to get username and password
    const strauth = new Buffer(b64auth, 'base64').toString()                // convert the base64 encode to string
    const splitIndex = strauth.indexOf(':')                                 // split the index to get emailAdress and password
    const email_address = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)

    if (!email_address || !password) {
        logger.error('username or password not provided');
        statsd.timing("get user api.timer",apiTimer);
        return res.status(401).send({ error: true, message: 'Please provide email address or pssword' });
    }

    var queryTimer = new Date();
    User.findAll({
        where: {
            email_address: email_address
        }
    }).then((result) => {
        if ((result.length == 0)) {
            statsd.timing("get user api.timer",apiTimer);
            statsd.timing("get user query.timer",queryTimer);
            logger.error('Email not found');
            res.status(400).send({ message: 'Email not found' })
        }

        const pass_compare = bcrypt.compareSync(password, result[0].password);               // compare the hashed password with password provided
        // console.log(pass_compare)
        if (!pass_compare) {
            logger.error('Password not valid!');
            return res.status(401).send({ message: 'Password not valid!' });
        }
        statsd.timing("get user api.timer",apiTimer);
        statsd.timing("get user query.timer",queryTimer);
        logger.info(`get ${result[0].email_address} user detail success`);
        res.status(200).json({ id: result[0].id, first_name: result[0].first_name, last_name: result[0].last_name, email_address: result[0].email_address, account_created: result[0].createdAt, account_updated: result[0].updatedAt });
    }).catch(err => res.status(400))

}


// Create a user
exports.post_user = async (req, res) => {

    var apiTimer = new Date();
    statsd.increment("post user details api called");
    const user = req.body;
    const password_schema = joi.string().regex(/[a-zA-Z0-9]{5,30}/).required();

    if (!user.email_address) {
        statsd.timing("post user api.timer",apiTimer);
        logger.error("Email address not provided");
        return res.status(400).send({ message: 'Email address not provided' });
    }

    bcrypt.hash(user.password, saltRounds, function (err, hash) {
        var queryTimer = new Date();
        User.findOrCreate({
            where: {
                email_address: user.email_address
            },
            defaults: {
                id: uuidv4(),
                email_address: user.email_address,
                password: hash,
                first_name: user.first_name,
                last_name: user.last_name,
                account_created: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
                account_updated: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0]
            }
        }).then((result) => {
            if (!result[1]) { // false if user already exists and was not created.
                console.log(result);    
                statsd.timing("post user api.timer",apiTimer);
                statsd.timing("post user query.timer",queryTimer);
                logger.error(`user does not exists`);
                return res.status(400).send({ message: "Email address already exists" })
            }

            joi.validate(user.password, password_schema, (err, result) => {
                if (err) {
                    //console.log(err);
                    return res.status(400).send({ message: 'Password does not meet requirements' });
                }
                statsd.timing("post user api.timer",apiTimer);
                statsd.timing("post user query.timer",queryTimer);
                logger.info(`user ${user.email_address} created`);
                res.status(201).send({ message: "User created" })
            })
        })
        .catch(err => { return res.status(400).send({ message: 'Error creating user' }) })

    })

}

// Update a user
exports.update_user = (req, res) => {

    var apiTimer = new Date();
    statsd.increment("update user details api called");
    const user = req.body;
    const password_schema = joi.string().regex(/[a-zA-Z0-9]{5,30}/).required();

    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''   // split the base64 code to get username and password
    const strauth = new Buffer(b64auth, 'base64').toString()                // convert the base64 encode to string
    const splitIndex = strauth.indexOf(':')                                 // split the index to get emailAdress and password
    const email_address = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)

    if (!email_address || !password) {
        statsd.timing("update user api.timer",apiTimer);
        logger.error('Please provide email address or pssword');
        return res.status(401).send({ error: true, message: 'Please provide email address or pssword' });
    }

    if (user.email_address) {
        statsd.timing("update user api.timer",apiTimer);
        logger.error('Email cannot be updated');
        return res.status(400).send({ message: 'Email cannot be updated' });
    }

    if (!user.first_name || !user.last_name || !user.password) {
        statsd.timing("update user api.timer",apiTimer);
        return res.status(400).send({ message: 'One or more fileds are not provided for update' });
    }

    bcrypt.hash(user.password, saltRounds, function (err, hash) {
        var queryTimer = new Date();
        User.findOne({
            where: {
                email_address: email_address
            }
        }).then((result) => {
            if (result['email_address'] == null) { // false if author already exists and was not created.
                statsd.timing("update user api.timer",apiTimer);
                statsd.timing("update user query.timer",queryTimer);
                logger.error('Email does not exists');
                return res.status(400).send({ message: "Email does not exists" })
            }

            const pass_compare = bcrypt.compareSync(password, result['password']);               // compare the hashed password with password provided
            // console.log(pass_compare)
            if (!pass_compare) {
                logger.error('Password not valid!');
                return res.status(401).send({ message: 'Password not valid!' });
            }

            User.update({
                password: hash,
                first_name: user.first_name,
                last_name: user.last_name,
                account_updated: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0]
            }, {
                where: {
                    email_address: email_address
                }
            }).then(() => {
                joi.validate(user.password, password_schema, (err, result) => {
                    if (err) {
                        //console.log(err);
                        statsd.timing("update user api.timer",apiTimer);
                        statsd.timing("update user query.timer",queryTimer);
                        logger.error('Password does not meet requirements');
                        return res.status(400).send({ message: 'Password does not meet requirements' });
                    }
                    statsd.timing("update user api.timer",apiTimer);
                    statsd.timing("update user query.timer",queryTimer);
                    logger.info(`user ${email_address} updated`);
                    res.status(204).send({ message: "User Updated" })
                })
            }).catch(err => { console.log(err); return res.status(400).send({ message: 'Error updating user' }) })

        }).catch(err => { return res.status(400).send({ message: 'Email does not exists' }) })
    })
}
