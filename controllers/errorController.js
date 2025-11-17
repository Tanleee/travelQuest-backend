const AppError = require('./../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const message = `Duplicate fields value: ${err.keyValue.name}.Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  let message = 'Invalid input data. ';

  Object.values(err.errors).forEach((value) => {
    message += value.message;
  });
  return new AppError(message, 400);
};

const handleJWTError = () => {
  let message = 'Invalid token. Please log in again!';
  return new AppError(message, 401);
};

const handleJWTExpiredError = () => {
  let message = 'Your token has been expire! Please log in again.';
  return new AppError(message, 401);
};

const sendErrorDev = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }
  //Render website
  console.error('ERROR 💥: ', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  //Operational: trusted error : send message to client
  if (req.originalUrl.startsWith('/api')) {
    if (err.is_Operational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });

      //Programing or other unknown error: dont't leak error details.
    }

    //1) Log error
    console.error('ERROR 💥: ', err);

    //2)Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong'
    });
  }

  if (err.is_Operational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });

    //Programing or other unknown error: dont't leak error details.
    // If err isn't created from AppError -> err.is_Operational = undefined
  }

  //1) Log error
  console.error('ERROR 💥: ', err);

  //2)Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later'
  });
};

module.exports = (err, req, res, next) => {
  console.log(err.statusCode);

  err.statusCode = err.statusCode || 500;

  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (err.name === 'CastError') {
      error = handleCastErrorDB(error);
    } else if (err.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    } else if (err.name == 'ValidationError') {
      error = handleValidationErrorDB(error);
    } else if (err.name == 'JsonWebTokenError') {
      error = handleJWTError();
    } else if (err.name == 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }
    sendErrorProd(error, req, res);
  }
};
