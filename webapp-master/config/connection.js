const mysql = require('mysql');
const dbConfig = require('./db.config');
const Sequelize = require('sequelize');
const fs = require("fs");
var envpath = process.env.HOME;

require('dotenv').config({path : envpath + "/.env"});

mysqlConnection =  new Sequelize(process.env.DB_NAME , process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    operatorsAliases: false,
    ssl  : {
      ca : fs.readFileSync(__dirname + '/rds-combined-ca-bundle.pem')
    },
  
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
  });

  mysqlConnection.query("CREATE DATABASE IF NOT EXISTS `csye6225`;").then(() => console.log("Database created!")).catch((err) => {console.log("Error in database creation")})

  mysqlConnection.authenticate()
                 .then(() => console.log('Connected'))
                 .catch(err => console.log(err))

module.exports = mysqlConnection;