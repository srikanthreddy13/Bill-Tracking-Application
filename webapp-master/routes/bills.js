var express = require('express');
var router = express.Router();

const BillController = require("../controllers/bills");

// Get all bill
router.get('/', BillController.get_all_bills);

// Get all bills due x days
router.get('/due/:days', BillController.get_all_bills_due);

// Get a specific bill
router.get('/:billId', BillController.get_bills);

// Add a new bill  
router.post('/', BillController.post_bills);

// Update bill details
router.put('/:billId', BillController.update_bill);

// Delete bill details
router.delete('/:billId', BillController.delete_bill);


module.exports = router;