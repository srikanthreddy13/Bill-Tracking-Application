const mysqlConnection = require("../config/connection");
const Sequelize = require('sequelize');

var Bill = mysqlConnection.define('bills', {
  id: {
    type: Sequelize.STRING,
    field: 'id',
    primaryKey: true
  },
  createdAt: {
    type: Sequelize.DATE,
    field: 'created_ts' 
  },
  updatedAt: {
    type: Sequelize.DATE, 
    field: 'updated_ts' 
  },
  owner_id: {
    type: Sequelize.STRING,
    field: 'owner_id'
  },
  vendor: {
    type: Sequelize.STRING,
    allowNull: false,
    field: 'vendor' 
  },
  bill_date: {
    type: Sequelize.DATEONLY,
    allowNull: false,
    field: 'bill_date' 
  },
  due_date: {
    type: Sequelize.DATEONLY,
    allowNull: false,
    field: 'due_date' 
  },
  amount_due: {
    type: Sequelize.DECIMAL,
    allowNull: false,
    field: 'amount_due',
    validate : {
        min: 0.01,
    } 
  },
  categories: {
    type: Sequelize.STRING,
    allowNull: false,
    field: 'categories'
  },
  paymentStatus: {
    type: Sequelize.ENUM('paid','due',' past_due','no_payment_required'),
    allowNull: false,
    field: 'paymentStatus' 
  },
  attachment: {
    type: Sequelize.TEXT,
    allowNull: false,
    field: 'attachment'
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
Bill.sync().then(() => console.log("Bills table created"));

module.exports = Bill;