const express = require('express');

const router = express.Router();
const userController = require('../controllers/user');

router.put('/updateavatar', userController.updateAvatar);
router.put('/updatedefaultgroup', userController.updateDefaultGroup);
router.get('/check', userController.getUser);

module.exports = router;
