var SDC = require('statsd-client'),
sdc = new SDC({host: 'localhost'});

module.exports = sdc;