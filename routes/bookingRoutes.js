// const express = require('express');
// const bookingController = require('./../controllers/bookingController');
// const authController = require('./../controllers/authController');

// // Get access to params in parent route
// const router = express.Router();

// router.use(authController.protect);
// router.get('/my-bookings', bookingController.getUserBookings);
// router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

// router.use(authController.restrictTo('lead-guide', 'admin'));

// router
//   .route('/')
//   .get(bookingController.getAllBooking)
//   .post(bookingController.createBooking);
// router
//   .route('/:id')
//   .get(bookingController.getBooking)
//   .patch(bookingController.updateBooking)
//   .delete(bookingController.deleteBooking);

// module.exports = router;

const express = require('express');
const bookingController = require('./../controllers/bookingController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

router.use(authController.protect);

router.get('/my-bookings', bookingController.getUserBookings);
router.get('/checkout-session/:tourId', bookingController.getCheckoutSession);

router.use(authController.restrictTo('lead-guide', 'admin'));

router
  .route('/')
  .get(bookingController.getAllBooking)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;
