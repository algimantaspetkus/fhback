const express = require('express');

const router = express.Router();
const familyController = require('../controllers/family');

router.post('/addfamily', familyController.addNew);
router.get('/getfamilies', familyController.getFamilies);

module.exports = router;
