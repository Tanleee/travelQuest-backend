const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');
const { log } = require('console');

const signToken = (id) => {
  return jwt.sign(
    {
      id: id
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN
    }
  );
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRES_IN * 24 * 3600 * 1000
    ),
    httpOnly: true,
    sameSite: 'none', // QUAN TRỌNG: cho phép cross-origin
    secure: true // BẮT BUỘC khi sameSite='none'
  };

  // Nếu đang ở development và không dùng HTTPS
  if (process.env.NODE_ENV !== 'production') {
    cookieOptions.sameSite = 'lax'; // hoặc 'strict'
    cookieOptions.secure = false;
  }

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};

// Create new account
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

exports.googleAuth = async (req, res, next) => {
  try {
    const { credential, isSignUp } = req.body;

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Tìm hoặc tạo user
    let user = await User.findOne({ email })
      .select('+active')
      .setOptions({ skipInactive: true });

    if (!user) {
      if (!isSignUp) {
        return res.status(401).json({
          status: 'fail',
          message: 'Tài khoản không tồn tại. Vui lòng đăng ký.'
        });
      }

      user = await User.create({
        name,
        email,
        googleId,
        photo: picture,
        password: crypto.randomBytes(32).toString('hex'),
        passwordConfirm: undefined,
        isGoogleAuth: true
      });
    } else if (!user.active) {
      return next(new AppError(email, 403));
    }

    // Tạo JWT token
    createSendToken(user, 200, res);
  } catch (err) {
    next(err);
  }
};

exports.login = catchAsync(async (req, res, next) => {
  const { email, password, ...rest } = req.body;

  //Check password and email exist
  if (!password || !email) {
    return next(new AppError('Please provide email and password!', 400));
  }

  //Check email and password is correct

  const user = await User.findOne({ email: email })
    .select('+password +active')
    .setOptions({ skipInactive: true });

  const correct = await user.correctPassword(password, user.password);
  if (!correct) {
    return next(new AppError('Email or password was wrong!', 401));
  }

  if (!user.active) {
    return next(
      new AppError(
        'Tài khoản của bạn đã bị vô hiệu hóa. Bạn có muốn khôi phục tài khoản?',
        403
      )
    );
  }

  // If ok send token to client
  createSendToken(user, 200, res);
});

exports.recoverAccount = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email }).setOptions({ skipInactive: true });

  if (!user) {
    return next(new AppError('Không tìm thấy tài khoản', 404));
  }

  user.active = true;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Tài khoản đã được khôi phục'
  });
});

// exports.logout = (req, res, next) => {
//   const cookieOptions = {
//     httpOnly: true,
//     expires: new Date(Date.now() + 10 * 1000) //expires in 10s cause it just a fake cookie to announce front know
//   };

//   if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

//   res.cookie('jwt', 'loggedout', cookieOptions); //fake cookie for jwt

//   res.status(200).json({
//     status: 'success'
//   });
// };

exports.logout = (req, res, next) => {
  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 10 * 1000),
    sameSite: 'none',
    secure: true
  };

  if (process.env.NODE_ENV !== 'production') {
    cookieOptions.sameSite = 'lax';
    cookieOptions.secure = false;
  }

  res.cookie('jwt', 'loggedout', cookieOptions);

  res.status(200).json({
    status: 'success'
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // Getting token and check off it's there
  // authorization: Bearer token_string
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not log in! Please log in to get access', 401)
    );
  }

  //Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // { id: '689c33332dcddbdcf460cdd1', iat: 1755097637, exp: 1762873637 }

  // Check user still exist (exist in database) - make sure token of deleted user account can't be used
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError('The user belong to this token does no longer exist.', 401)
    );
  }

  // Check if user has change password while token hasn't expired yet.
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changde password! Please log in again.', 401)
    );
  }

  //Grant access to protected route
  req.user = currentUser; // may be useful future
  res.locals.user = currentUser;
  next();
});

exports.isLogin = catchAsync(async (req, res, next) => {
  try {
    console.log('Check islogin');

    if (req.cookies.jwt) {
      //Verification token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // Check user still exist (exist in database) - make sure token of deleted user account can't be used
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next();
      }

      // Check if user has change password while token hasn't expired yet.
      if (currentUser.changePasswordAfter(decoded.iat)) {
        return next();
      }

      // Server side render
      res.locals.user = currentUser;
    }
  } catch (err) {
    return next();
  }
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`You don't have permission to do this action!`, 401)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async function (req, res, next) {
  //1) Find user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address', 404));
  } else if (user.isGoogleAuth) {
    return next(
      new AppError(
        "It looks like your account is registered using your Google account. To log in, please use the 'Sign in with Google' button."
      )
    );
  }

  //2) Generate random reset token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  //3) Send it to user email

  try {
    // const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'The link has been sent to your email.'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async function (req, res, next) {
  // Send password and password confirm along with resetpassword url in email
  // Get user base on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Token invalid or has expired', 400));
  }

  // Set new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  user.passwordChangeAt = Date.now();
  await user.save();

  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async function (req, res, next) {
  // console.log(req.user._id, req.body);
  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  //No need to check password and passwordConfirm cause if both aren't same , schema have validator to handle this
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  createSendToken(user, 200, res);
});
