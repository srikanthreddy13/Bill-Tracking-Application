var express = require('express');
var router = express.Router();

const FileController = require("../controllers/files");


//Get a file
router.get('/:fileId', FileController.get_file);

//Post a file
router.post('/', FileController.post_file);

//Update a file
router.put('/:fileId', FileController.update_file);

//Delete a file
router.delete('/:fileId', FileController.delete_file);

module.exports = router;