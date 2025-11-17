const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeature = require('./../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that id!', 404));
    }

    res.status(204).send({
      status: 'success',
      data: null
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      return next(new AppError('No document found with that id!', 404));
    }

    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.getOne = (Model, popOtions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOtions) {
      query = query.populate(popOtions);
    }

    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that id!', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.getAll = (Model, options) =>
  catchAsync(async (req, res, next) => {
    let filter = {};
    if (req.params.tourId) filter.tour = req.params.tourId;
    if (options) filter = options;

    // Sử dụng req.queryOverride nếu có, nếu không dùng req.query
    const queryString = req.queryOverride || req.query;

    const feature = new APIFeature(Model.find(filter), queryString)
      .filter()
      .sort()
      .limitFields()
      .pagination();

    const doc = await feature.query;

    res.status(200).json({
      status: 'success',
      result: doc.length,
      data: {
        data: doc
      }
    });
  });
