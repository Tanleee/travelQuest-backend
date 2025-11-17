const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');
const Booking = require('./../models/bookingModel');

exports.allowPost = catchAsync(async (req, res, next) => {
  const booking = await Booking.findOne({
    user: req.user._id,
    tour: req.params.tourId
  });
  if (!booking) return next(new AppError(`You haven't booked this tour`, 400));

  const review = await Review.findOne({ user: req.user._id });
  if (review) {
    return next(
      new AppError(`You have already post review for this tour.`, 400)
    );
  }

  next();
});

exports.setTourUserIds = (req, res, next) => {
  // Allow nested route
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user._id;
  next();
};

exports.allowModify = catchAsync(async (req, res, next) => {
  if (req.user.role === 'admin') return next();

  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError('No document found with that id!', 404));
  }

  if (review.user.id != req.user.id) {
    return next(
      new AppError(`You don't have permission to do this action!`, 401)
    );
  }

  next();
});

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
