const express = require('express');
const { generateContent } = require('../controllers/chatController');

const router = express.Router();

router.post('/', generateContent);

module.exports = router;
