const mongoose = require('mongoose');
const validator = require('validator');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, 'Please tell us your name.']
    },
    email: {
      type: String,
      required: [true, 'Please provide your email.'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email.']
    },
    photo: {
      type: String,
      default: 'default.jpg'
    },

    // ✅ Google Auth fields
    googleId: {
      type: String,
      unique: true,
      sparse: true // Cho phép null, chỉ unique khi có giá trị
    },
    isGoogleAuth: {
      type: Boolean,
      default: false
    },

    password: {
      type: String,
      // ✅ Chỉ bắt buộc khi KHÔNG đăng ký bằng Google
      required: function () {
        return !this.isGoogleAuth;
      },
      minlength: 8,
      select: false
    },
    passwordConfirm: {
      type: String,
      // ✅ Chỉ bắt buộc khi KHÔNG đăng ký bằng Google
      required: function () {
        return !this.isGoogleAuth && this.isNew;
      },
      validate: {
        validator: function (val) {
          return this.password === val;
        },
        message: 'Passwords are not the same!'
      }
    },

    passwordChangeAt: Date,
    role: {
      type: String,
      enum: ['user', 'admin', 'guide', 'lead-guide'],
      default: 'user'
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false
    }
  },
  {
    timestamps: true // ✅ Thêm createdAt, updatedAt
  }
);

// ✅ Chỉ hash password khi KHÔNG phải Google Auth
userSchema.pre('save', async function (next) {
  // Skip nếu password không thay đổi hoặc là Google Auth
  if (!this.isModified('password') || this.isGoogleAuth) {
    return next();
  }

  // Encrypt password
  this.password = await bcryptjs.hash(this.password, 12);

  // Delete password confirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }

  this.passwordChangeAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, async function (next) {
  if (this.getOptions().skipInactive) {
    return next();
  }

  this.find({ active: { $ne: false } });

  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcryptjs.compare(candidatePassword, userPassword);
};

userSchema.methods.changePasswordAfter = function (JWTTimeStamp) {
  if (!this.passwordChangeAt) return false;

  const changeTimeStamp = this.passwordChangeAt.getTime();
  JWTTimeStamp = Number.parseInt(JWTTimeStamp);
  JWTTimeStamp *= 1000;

  return changeTimeStamp > JWTTimeStamp;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
