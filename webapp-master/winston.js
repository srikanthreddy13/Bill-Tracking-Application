const winston = require('winston');
const path = require('path');
const fs = require('fs');
const dir = 'logs';

if(!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

const logger = winston.createLogger({
    level: 'info',
    format:winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.json()
        ),
    transports: [
        new winston.transports.File({
            filename: path.join(dir, '/webapp.log')
        })
]});

module.exports = logger;