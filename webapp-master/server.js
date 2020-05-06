
const express = require("express");
const bodyParser = require("body-parser");
const mysqlConnection = require("./config/connection");
const sns = require('./controllers/snsPublish');
// Routes for User
const userRouter = require("./routes/user");

// Routes for bills
const billRouter = require("./routes/bills");

// Routes for file
const fileRouter = require("./routes/files");

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.use('/v1/user', userRouter);

app.use('/v2/bill', billRouter);

app.use('/v1/bill/:billId/file', fileRouter);

// Error handling
app.use((req, res, next) => {
    const error = new Error('Not found');
    error.status = 404;
    next(error);
})

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    console.log(error);
    res.json({
        error: {
            message: error.message

        }

    });
});


// app.listen(3000);
app.listen(3000)

module.exports = app;