class AppError extends Error {
  constructor(message, statusCode) {
    super(message); //message property is enumrable

    this.statusCode = statusCode;
    this.status = `${this.statusCode}`.startsWith('4') ? 'fail' : 'error';
    // If err isn't created from AppError -> err.is_Operational = undefined
    this.is_Operational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
