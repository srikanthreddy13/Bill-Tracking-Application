var express = require('express');
var router = express.Router();

const UserController = require("../controllers/user");

// User details
router.get('/', UserController.get_user);


// Add a new user  
router.post('/', UserController.post_user);


// Update user details
router.put('/', UserController.update_user);


module.exports = router;