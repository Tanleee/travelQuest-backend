const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './../../config.env' });
const fs = require('fs');

const Tour = require('./../../models/tourModel');
const User = require('./../../models/userModel');
const Review = require('./../../models/reviewModel');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose.connect(DB).then((con) => console.log('DB connection successful!'));

// Read json file
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/tours-vn.json`, { encoding: 'utf-8' })
);
const user = JSON.parse(
  fs.readFileSync(`${__dirname}/users.json`, { encoding: 'utf-8' })
);
const review = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews-vn.json`, { encoding: 'utf-8' })
);

const importData = async () => {
  try {
    await Tour.create(tours, { validateBeforeSave: false });
    await User.create(user, { validateBeforeSave: false });
    await Review.create(review, { validateBeforeSave: false });

    console.log('Data sucessfully loaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// Delete all data from database
const deleteData = async () => {
  try {
    await Tour.deleteMany({});
    await User.deleteMany({});
    await Review.deleteMany({});

    console.log('Data sucessfully deleted!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
// console.log(process.argv);
