const mysqlConnection = require("../config/connection");
const Sequelize = require('sequelize');

var User = mysqlConnection.define('users', {
  id: {
    type: Sequelize.STRING,
    field: 'id',
    primaryKey: true
  },
  email_address: {
    type: Sequelize.STRING,
    field: 'email_address',
    validate : {
      isEmail: true
    }
  },
  first_name: {
    type: Sequelize.STRING,
    allowNull: false,
    field: 'first_name' 
  },
  last_name: {
    type: Sequelize.STRING,
    allowNull: false,
    field: 'last_name' 
  },
  
  createdAt: {
    type: Sequelize.DATE,
    field: 'account_created' 
  },
  updatedAt: {
    type: Sequelize.DATE, 
    field: 'account_updated' 
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
    field: 'password' 
  }
}, {
  freezeTableName: true // Model tableName will be the same as the model name

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
User.sync().then(() => console.log("Users table created"));

module.exports = User;