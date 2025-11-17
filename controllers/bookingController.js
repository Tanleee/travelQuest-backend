const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const Booking = require('./../models/bookingModel');
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');
const User = require('./../models/userModel');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  //Get currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  //Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${process.env.CLIENT_URL}/user?alert=booking`,
    cancel_url: `${process.env.CLIENT_URL}/tours/${tour.id}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    mode: 'payment',
    // Thêm metadata để sử dụng trong webhook
    metadata: {
      tourId: req.params.tourId,
      userId: req.user.id
    },
    line_items: [
      {
        price_data: {
          currency: 'vnd',
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`http://127.0.0.1:3000/img/tours/${tour.imageCover}`]
          },
          unit_amount: tour.price * 1000
        },
        quantity: 1
      }
    ]
  });

  //Create session as response
  res.status(200).json({
    status: 'success',
    session
  });
});

// Hàm tạo booking từ Stripe Checkout Session
const createBookingFromCheckout = async (session) => {
  const tour = session.metadata.tourId;
  const user = session.metadata.userId;
  const price = session.amount_total / 1000;

  await Booking.create({ tour, user, price });
};

// Webhook handler cho Stripe events
exports.webhookCheckout = catchAsync(async (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    await createBookingFromCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
});

// GIỮ LẠI hàm này như temporary solution (nếu cần)
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price } = req.query;
  if (!tour || !user || !price) return next();

  await Booking.create({ tour, user, price });
  res.redirect(req.originalUrl.split('?')[0]);
});

exports.getUserBookings = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user._id });

  const tourIds = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(200).json({
    status: 'success',
    tours
  });
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBooking = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
