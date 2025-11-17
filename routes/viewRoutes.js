const express = require('express');
const viewController = require('./../controllers/viewController');
const authControler = require('./../controllers/authController');
const bookingController = require('./../controllers/bookingController');

const router = express.Router();

router.get(
  '/',
  bookingController.createBookingCheckout,
  authControler.isLogin,
  viewController.getOverview
);

router.get('/tour/:slug', authControler.isLogin, viewController.getTour);
router.get('/login', authControler.isLogin, viewController.getLoginForm);
router.get('/signup', viewController.getSignUpForm);
router.get('/me', authControler.protect, viewController.getAccount);
router.get('/my-tours', authControler.protect, viewController.getMyTours);

module.exports = router;
