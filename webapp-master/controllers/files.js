const mysqlConnection = require("../config/connection");
const Bill = require("../models/bills");
const User = require("../models/user");
const File = require("../models/file");
const uuidv4 = require('uuid/v4');
const statsd = require('../statsd-client');
const logger = require('../winston');
var fs = require('fs');
var dir = __dirname + "/uploads/";

// AWS S3 connection
const AWS = require('aws-sdk');
var s3 = new AWS.S3();

// Using bcrypt to hash the password and store in the databse
const bcrypt = require("bcryptjs");

// middleare to stroe files on the server
const formidable = require('formidable');

// Post a bill for a user
exports.post_file = async (req, res) => {

    var apiTimer = new Date();
    statsd.increment("post file api called");
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''   // split the base64 code to get username and password
    const strauth = new Buffer(b64auth, 'base64').toString()                // convert the base64 encode to string
    const splitIndex = strauth.indexOf(':')                                 // split the index to get emailAdress and password
    const email_address = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)

    if (!email_address || !password) {
        statsd.timing("post file api.timer",apiTimer);
        logger.error('POST FILE: Please provide email address or password');
        return res.status(401).send({ error: true, message: 'Please provide email address or password' });
    }

    var queryTimer = new Date();
    // check if user exists
    User.findOne({
        where: {
            email_address: email_address
        }
    }).then((result) => {
        if (result.length == 0) { // false if author already exists and was not created.
            statsd.timing("post file api.timer",apiTimer);
            statsd.timing("post file query.timer",queryTimer);
            logger.error('POST FILE: Email does not exists');
            return res.status(400).send({ message: "Email does not exists" })
        }

        const pass_result = bcrypt.compareSync(password, result['password']);               // compare the hashed password with password provided
        if (!pass_result) {
            statsd.timing("post file api.timer",apiTimer);
            statsd.timing("post file query.timer",queryTimer);
            logger.error('POST FILE: Password not valid!');
            return res.status(401).send({ message: 'Password not valid!' });
        }
        const billId = req.baseUrl.substring(9, 45);
        const user_id = result['id'];
        const file_owner = result['email_address']

        // Find if the bill exists, if not throw an error saying it does not exists
        Bill.findOne({
            where: {
                id: billId
            }
        }).then((result) => {
            if (result.lenth == 0) {
                statsd.timing("post file api.timer",apiTimer);
                statsd.timing("post file query.timer",queryTimer);
                logger.error('POST FILE: Bill not found');
                return res.status(404).send({ message: 'Bill not found' })
            }

            // check if the bill is associated with the user
            Bill.findOne({
                where: {
                    id: billId,
                    owner_id: user_id
                }
            }).then((result) => {
                if (result.length == 0) {
                    statsd.timing("post file api.timer",apiTimer);
                    statsd.timing("post file query.timer",queryTimer);
                    logger.error('POST FILE: Not authorized to attach file to bill');
                    return res.status(401).send({ message: 'Not authorized to attach file to bill' })
                }

                const form = new formidable.IncomingForm();                     // form to handle upload of file
                form.parse(req, function (err, fields, files) {
                    var fileType = files.files.type.split('/').pop();
                    if (fileType == 'jpg' || fileType == 'png' || fileType == 'jpeg' || fileType == 'pdf') {
                        var oldpath = files.files.path;


                        var file_name = billId + files.files.name;
                        if (process.env.DB_HOST == "localhost") {
                            if (!fs.existsSync(dir)) {                                   // check if the uploads directory exists
                                fs.mkdirSync(dir);
                            }
                            var newpath = __dirname + "/uploads/" + file_name;
                        }
                        else {
                            var newpath = process.env.S3_BUCKET_URL + "/" + file_name;
                        }

                        console.log(file_name);
                        const uuid = uuidv4();
                        File.findOrCreate({
                            where: {
                                file_name: file_name
                            },
                            defaults: {
                                id: uuid,
                                bill_id: billId,
                                file_name: file_name,
                                url: newpath,
                                file_owner: file_owner,
                                size: files.files.size
                            }
                        }).then((result) => {
                            if (!result[1]) { // false if user already exists and was not created.
                                statsd.timing("post file api.timer",apiTimer);
                                statsd.timing("post file query.timer",queryTimer);
                                logger.error('POST FILE: File already exists');
                                return res.status(400).send({ message: "File already exists" })
                            }

                            if (process.env.DB_HOST == "localhost") {
                                // Old upload
                                fs.rename(oldpath, newpath, function (err) {
                                    if (err) throw err;
                                });
                            }
                            else {
                                var s3Timer = new Date();
                                const params = {
                                    Bucket: process.env.S3_BUCKET,
                                    Key: file_name,
                                    Body: "JSON.stringify(data, null, 2)"
                                };

                                s3.upload(params, err => {
                                    if (err) {
                                        console.log(err);
                                    }
                                });
                                statsd.timing("post file s3.timer",s3Timer);
                            }


                            File.findOne({
                                where: {
                                    id: uuid
                                }
                            }).then((result) => {
                                statsd.timing("post file api.timer",apiTimer);
                                statsd.timing("post file query.timer",queryTimer);
                                logger.info(`POST FILE: File ${result['file_name']} created`);
                                res.status(201).send({ id: result['id'], file_name: result['file_name'], upload_date: result['createdAt'], url: result['url'] });

                            }).catch(err => res.status(400).send({ message: 'Error retrieving file info' }));

                            const fileinfo = "FILE_NAME: " + file_name + "; ID: " + uuid + "; UPLOAD_DATE: " + new Date().toISOString().split('T')[0] + "; URL: " + newpath;

                            Bill.update({
                                attachment: fileinfo

                            }, {
                                where: {
                                    id: billId,
                                    owner_id: user_id
                                }
                            }).then()
                            // .catch((err) => { return res.status(400).send({ message: "Error updating a bill" }) })
                        })

                    } else {
                        
                        return res.status(400).send({ message: 'File type not supported' })
                    }
                });
            })
                .catch(err => { return res.status(401).send({ message: 'Not authorized to attach file to bill' }) })
        })
            .catch(err => { return res.status(404).send({ message: 'Bill not found' }) })
    })
        .catch(err => { console.log(err); return res.status(400).send({ message: 'Email does not exists' }) })

};


// Fetch file information based on the bill ID and the user
exports.get_file = (req, res) => {

    var apiTimer = new Date();
    statsd.increment("get file api called");
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''   // split the base64 code to get username and password
    const strauth = new Buffer(b64auth, 'base64').toString()                // convert the base64 encode to string
    const splitIndex = strauth.indexOf(':')                                 // split the index to get emailAdress and password
    const email_address = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)

    if (!email_address || !password) {
        statsd.timing("get file api.timer",apiTimer);
        logger.error('GET FILE: Please provide email address or password');
        return res.status(401).send({ error: true, message: 'Please provide email address or password' });
    }

    var queryTimer = new Date();
    // check if user exists
    User.findOne({
        where: {
            email_address: email_address
        }
    }).then((result) => {
        if (result.length == 0) { // false if author already exists and was not created.
            statsd.timing("get file api.timer",apiTimer);
            statsd.timing("get file query.timer",queryTimer);
            logger.error('GET FILE: Email does not exists');
            return res.status(400).send({ message: "Email does not exists" })
        }

        const pass_result = bcrypt.compareSync(password, result['password']);               // compare the hashed password with password provided
        if (!pass_result) {
            logger.error('GET FILE: Password not valid!');
            return res.status(401).send({ message: 'Password not valid!' });
        }
        const billId = req.baseUrl.substring(9, 45);
        const user_id = result['id'];
        const file_owner = result['email_address'];

        // Find if the bill exists, if not throw an error saying it does not exists
        Bill.findOne({
            where: {
                id: billId
            }
        }).then((result) => {
            if (result.length == 0) {
                statsd.timing("get file api.timer",apiTimer);
                statsd.timing("get file query.timer",queryTimer);
                logger.error('GET FILE: Bill not found');
                return res.status(400).send({ message: 'Bill not found' })
            }

            // check if the bill is associated with the user
            Bill.findOne({
                where: {
                    id: billId,
                    owner_id: user_id
                }
            }).then((result) => {
                File.findOne({
                    where: {
                        id: req.params.fileId
                    }
                }).then((result) => {
                    // console.log(result)
                    if (result == null) {
                        statsd.timing("get file api.timer",apiTimer);
                        statsd.timing("get file query.timer",queryTimer);
                        logger.error('GET FILE: File info not found');
                        return res.status(404).send({ message: 'File info not found' })
                    }

                    File.findOne({
                        where: {
                            id: req.params.fileId,
                            bill_id: billId,
                            file_owner: file_owner
                        }
                    }).then((result) => {
                        if (result == null) {
                            statsd.timing("get file api.timer",apiTimer);
                            statsd.timing("get file query.timer",queryTimer);
                            logger.error('GET FILE: File info cannot be seen');
                            return res.status(401).send({ message: 'File info cannot be seen' })
                        }

                        statsd.timing("get file api.timer",apiTimer);
                        statsd.timing("get file query.timer",queryTimer);
                        logger.info('GET FILE: File info retrieve success');
                        res.status(200).send({ id: result['id'], file_name: result['file_name'], upload_date: result['createdAt'], url: result['url'] });
                    })
                        .catch((err) => { console.log(err); return res.status(404).send({ message: 'File Info not found' }) })
                })
                    .catch((err) => { console.log(err); return res.status(400).send({ message: 'Error finding file info' }) })
            })
                .catch(err => { return res.status(401).send({ message: 'Bill cannot be seen' }) })
        })
            .catch(err => { return res.status(404).send({ message: 'Bill not found' }) })
    })
        .catch(err => { console.log(err); return res.status(400).send({ message: 'Email does not exists' }) })

};


// Update a file based on the file ID and user
exports.update_file = (req, res) => {

    var apiTimer = new Date();
    statsd.increment("update file api called");
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''   // split the base64 code to get username and password
    const strauth = new Buffer(b64auth, 'base64').toString()                // convert the base64 encode to string
    const splitIndex = strauth.indexOf(':')                                 // split the index to get emailAdress and password
    const email_address = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)

    if (!email_address || !password) {
        logger.error('UPDATE FILE: Please provide email address or password');
        return res.status(401).send({ error: true, message: 'Please provide email address or password' });
    }

    var queryTimer = new Date();
    // check if user exists
    User.findOne({
        where: {
            email_address: email_address
        }
    }).then((result) => {
        if (result.length == 0) { // false if author already exists and was not created.
            logger.error('UPDATE FILE: Email does not exists');
            return res.status(400).send({ message: "Email does not exists" })
        }

        const pass_result = bcrypt.compareSync(password, result['password']);               // compare the hashed password with password provided
        if (!pass_result) {
            logger.error('UPDATE FILE: Password not valid!');
            return res.status(401).send({ message: 'Password not valid!' });
        }
        const billId = req.baseUrl.substring(9, 45);
        const user_id = result['id'];
        const file_owner = result['email_address']

        // Find if the bill exists, if not throw an error saying it does not exists
        Bill.findOne({
            where: {
                id: billId
            }
        }).then((result) => {
            if (result.lenth == 0) {
                logger.error('UPDATE FILE: Bill not found');
                return res.status(404).send({ message: 'Bill not found' })
            }

            // check if the bill is associated with the user
            Bill.findOne({
                where: {
                    id: billId,
                    owner_id: user_id
                }
            }).then((result) => {
                if (result.length == 0) {
                    logger.error('UPDATE FILE: Not authorized to attach file to bill');
                    return res.status(401).send({ message: 'Not authorized to attach file to bill' })
                }
                console.log(req.params.fileId)
                File.findOne({
                    where: {
                        id: req.params.fileId
                    }
                }).then((result) => {
                    console.log(result)
                    if (result == null) {
                        logger.error('UPDATE FILE: File info not found');
                        return res.status(404).send({ message: 'File info not found' })
                    }

                    File.findOne({
                        where: {
                            id: req.params.fileId,
                            bill_id: billId,
                            file_owner: file_owner
                        }
                    }).then((result) => {
                        var s3Timer = new Date();
                        if (process.env.DB_HOST == "localhost") {
                            // Old upload
                            var file_delete = result['url'];
                            fs.unlinkSync(file_delete, (err) => {
                                if (err) return res.status(400).send({ message: 'Error deleting from folder' })
                            });
                        }
                        else {
                            var file_delete = result['url'].split('/')[3];
                            const params = {
                                Bucket: process.env.S3_BUCKET,
                                Key: file_delete
                            };

                            s3.deleteObject(params, err => {
                                if (err) {
                                    console.log(err);
                                }
                            });
                        }

                        File.destroy({
                            where: {
                                id: req.params.fileId,
                                bill_id: billId,
                                file_owner: file_owner
                            }
                        }).then((result) => {
                            if (result == 0) {
                                statsd.timing("update file api.timer",apiTimer);
                                statsd.timing("update file query.timer",queryTimer);
                                logger.error('UPDATE FILE: File cannot be updated');
                                return res.status(401).send({ message: 'File cannot be updated' })
                            }

                        })
                        .catch(err => { console.log(err); return res.status(400).send({ message: 'Error updating file' }) })


                        const form = new formidable.IncomingForm();                     // form to handle upload of file
                        form.parse(req, function (err, fields, files) {
                            var fileType = files.files.type.split('/').pop();
                            if (fileType == 'jpg' || fileType == 'png' || fileType == 'jpeg' || fileType == 'pdf') {
                                var oldpath = files.files.path;
                                var file_name = billId + files.files.name;
                                const uuid = uuidv4();

                                if (process.env.DB_HOST == "localhost") {
                                    // Old upload
                                    var newpath = __dirname + "/uploads/" + file_name;
                                }
                                else {
                                    var newpath = process.env.S3_BUCKET_URL + "/" + file_name;
                                }

                                File.create({
                                    id: uuid,
                                    bill_id: billId,
                                    file_name: file_name,
                                    url: newpath,
                                    file_owner: file_owner,
                                    size: files.files.size

                                }).then((result) => {
                                    if (process.env.DB_HOST == "localhost") {
                                        // Old upload
                                        fs.rename(oldpath, newpath, function (err) {
                                            if (err) throw err;
                                        });
                                    }
                                    else {
                                        const params = {
                                            Bucket: process.env.S3_BUCKET,
                                            Key: file_name,
                                            Body: "JSON.stringify(data, null, 2)"
                                        };

                                        s3.upload(params, err => {
                                            if (err) {
                                                console.log(err);
                                            }
                                        });
                                        statsd.timing("update file s3.timer",s3Timer);
                                    }

                                    const fileinfo = "FILE_NAME: " + file_name + "; ID: " + uuid + "; UPLOAD_DATE: " + new Date().toISOString().split('T')[0] + "; URL: " + newpath;

                                    Bill.update({
                                        attachment: fileinfo

                                    }, {
                                        where: {
                                            id: billId,
                                            owner_id: user_id
                                        }
                                    }).then(() => {
                                        statsd.timing("update file api.timer",apiTimer);
                                        statsd.timing("update file query.timer",queryTimer);
                                        logger.info('UPDATE FILE: File updated');
                                        res.status(204).send({ message: 'File updated' })
                                    })
                                        .catch((err) => { logger.error('UPDATE FILE: Error updating a bill with file'); return res.status(400).send({ message: "Error updating a bill with file" }) })
                                })
                                    .catch((err) => { logger.error('UPDATE FILE: Error updating a file'); return res.status(400).send({ message: "Error updating a file" }) })

                            } else {
                                logger.error('UPDATE FILE: File type not supported');
                                return res.status(400).send({ message: 'File type not supported' })
                            }


                        })
                    })
                        .catch((err) => { logger.error('UPDATE FILE: File Info cannot be seen'); return res.status(401).send({ message: 'File Info cannot be seen' }) })
                })
                    .catch((err) => { logger.error('UPDATE FILE: Error finding file info'); return res.status(400).send({ message: 'Error finding file info' }) })

            })
                .catch(err => { logger.error('UPDATE FILE: Not authorized to attach file to bill'); return res.status(401).send({ message: 'Not authorized to attach file to bill' }) })
        })
            .catch(err => { return res.status(404).send({ message: 'Bill not found' }) })
    })
        .catch(err => {  return res.status(400).send({ message: 'Email does not exists' }) })
};



// Delete a file based on the file ID and user
exports.delete_file = (req, res) => {

    var apiTimer = new Date();
    statsd.increment("delete file api called");
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''   // split the base64 code to get username and password
    const strauth = new Buffer(b64auth, 'base64').toString()                // convert the base64 encode to string
    const splitIndex = strauth.indexOf(':')                                 // split the index to get emailAdress and password
    const email_address = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)

    if (!email_address || !password) {
        statsd.timing("delete file api.timer",apiTimer);
        logger.error('DELETE BILL: Please provide email address or password');
        return res.status(401).send({ error: true, message: 'Please provide email address or password' });
    }

    var queryTimer = new Date();
    // check if user exists
    User.findOne({
        where: {
            email_address: email_address
        }
    }).then((result) => {
        if (result.length == 0) { // false if author already exists and was not created.
            logger.error('DELETE BILL: Email does not exists');
            return res.status(400).send({ message: "Email does not exists" })
        }

        const pass_result = bcrypt.compareSync(password, result['password']);               // compare the hashed password with password provided
        if (!pass_result) {
            logger.error('DELETE BILL: Password not valid!');
            return res.status(401).send({ message: 'Password not valid!' });
        }
        const billId = req.baseUrl.substring(9, 45);
        const user_id = result['id'];
        const file_owner = result['email_address']

        // Find if the bill exists, if not throw an error saying it does not exists
        Bill.findOne({
            where: {
                id: billId
            }
        }).then((result) => {
            if (result.lenth == 0) {
                logger.error('DELETE BILL: Bill not found');
                return res.status(404).send({ message: 'Bill not found' })
            }

            // check if the bill is associated with the user
            Bill.findOne({
                where: {
                    id: billId,
                    owner_id: user_id
                }
            }).then((result) => {
                if (result.length == 0) {
                    statsd.timing("delete file api.timer",apiTimer);
                    statsd.timing("delete file query.timer",queryTimer);
                    logger.error('DELETE BILL: Not authorized to attach file to bill');
                    return res.status(401).send({ message: 'Not authorized to attach file to bill' })
                }
                console.log(req.params.fileId)
                File.findOne({
                    where: {
                        id: req.params.fileId
                    }
                }).then((result) => {
                    console.log(result)
                    if (result == null) {
                        statsd.timing("delete file api.timer",apiTimer);
                        statsd.timing("delete file query.timer",queryTimer);
                        logger.error('DELETE BILL: File info not found');
                        return res.status(404).send({ message: 'File info not found' })
                    }

                    File.findOne({
                        where: {
                            id: req.params.fileId,
                            bill_id: billId,
                            file_owner: file_owner
                        }
                    }).then((result) => {
                        if (process.env.DB_HOST == "localhost") {
                            // Old upload
                            var file_delete = result['url'];
                            fs.unlinkSync(file_delete, (err) => {
                                if (err) return res.status(400).send({ message: 'Error deleting from folder' })
                            });
                        }
                        else {
                            var s3Timer = new Date();
                            var file_delete = result['url'].split('/')[3];
                            const params = {
                                Bucket: process.env.S3_BUCKET,
                                Key: file_delete
                            };

                            s3.deleteObject(params, err => {
                                if (err) {
                                    console.log(err);
                                }
                            });
                            statsd.timing("delete file s3.timer",s3Timer);
                        }    

                        File.destroy({
                            where: {
                                id: req.params.fileId,
                                bill_id: billId,
                                file_owner: file_owner
                            }
                        }).then((result) => {
                            if (result == 0) {
                                statsd.timing("delete file api.timer",apiTimer);
                                statsd.timing("delete file query.timer",queryTimer);
                                logger.error('DELETE BILL: File cannot be deleted');
                                return res.status(401).send({ message: 'File cannot be deleted' })
                            }

                            statsd.timing("delete file api.timer",apiTimer);
                            statsd.timing("delete file query.timer",queryTimer);
                            logger.info('DELETE BILL: File deleted');
                            return res.status(204).send({ message: 'File deleted' })
                        })
                            .catch(err => { console.log(err); return res.status(400).send({ message: 'Error deleting file' }) })

                    })
                        .catch((err) => { console.log(err); return res.status(401).send({ message: 'File Info cannot be seen' }) })
                })
                    .catch((err) => { console.log(err); return res.status(400).send({ message: 'Error finding file info' }) })

            })
                .catch(err => { return res.status(401).send({ message: 'Not authorized to attach file to bill' }) })
        })
            .catch(err => { return res.status(404).send({ message: 'Bill not found' }) })
    })
        .catch(err => { console.log(err); return res.status(400).send({ message: 'Email does not exists' }) })
};