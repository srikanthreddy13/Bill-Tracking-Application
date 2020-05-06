const mysqlConnection = require("../config/connection");
const Sequelize = require('sequelize');

var Files = mysqlConnection.define('files', {
  id: {
    type: Sequelize.STRING,
    field: 'id',
    primaryKey: true
  },
  bill_id: {
    type: Sequelize.STRING,
    field: 'bill_id',
    primaryKey: true
  },
  createdAt: {
    type: Sequelize.DATEONLY,
    field: 'upload_date' 
  },
  file_name: {
    type: Sequelize.STRING,
    field: 'file_name' 
  },
  url: {
    type: Sequelize.STRING,
    field: 'url' 
  },
  file_owner: {
    type: Sequelize.STRING,
    field: 'file_owner' 
  },
  size: {
    type: Sequelize.DOUBLE,
    field: 'size' 
  }
}, {
  freezeTableName: true, // Model tableName will be the same as the model name
  updatedAt: false

},
{
  indexes:[
   {
     unique: true,
     fields:['id']
   }
  ]
});

// Create the table if it does not exist
Files.sync().then(() => console.log("Files table created"));

module.exports = Files;