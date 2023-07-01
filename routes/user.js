const express = require('express');

const router = express.Router();
const userController = require('../controllers/user');

router.put('/updatedefaultfamily', userController.updateDefaultFamily);
router.get('/check', userController.getUser);

module.exports = router;
