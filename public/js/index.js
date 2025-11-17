import 'babel-polyfill'; //Make code run in old browser version

import { login, logout } from './login';
import { displayMap } from './mapbox';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';
import { signup } from './signup';

const mapbox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
const signupForm = document.querySelector('.form--signup');
const logoutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');

if (mapbox) {
  const locations = JSON.parse(mapbox.getAttribute('data-locations'));

  displayMap(id, locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const name = document.getElementById('name').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    signup(name, email, password, passwordConfirm);
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}

if (userDataForm) {
  const inputs = userDataForm.querySelectorAll(
    '[name="name"], [name="email"], [name="photo"]'
  );

  const saveBtn = document.getElementById('saveSettings');

  const form = new FormData();
  const initVal = {};

  inputs.forEach((el) => {
    let idEl = el.id;
    idEl === 'photo'
      ? (initVal[idEl] = el.files.length)
      : (initVal[idEl] = el.value);

    el.addEventListener('change', (e) => {
      // console.log('Have change');
      if (idEl === 'photo' && el.files.length) {
        form.set(idEl, el.files[0]);
        saveBtn.disabled = false;
      } else if (idEl !== 'photo') {
        form.set(idEl, el.value);
        el.value !== initVal[idEl]
          ? (saveBtn.disabled = false)
          : (saveBtn.disabled = true);
      }
    });
  });

  // console.log('Form: ', form);
  userDataForm.addEventListener('submit', (e) => {
    e.preventDefault();
    updateSettings(form, 'data');
  });
}

if (userPasswordForm) {
  userPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById('savePassword');
    saveBtn.textContent = 'Updating';
    saveBtn.disabled = true;

    const passwordCurrent = document.getElementById('passwordCurrent').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    await updateSettings(
      {
        passwordCurrent,
        password,
        passwordConfirm
      },
      'password'
    );

    document.getElementById('passwordCurrent').value = '';
    document.getElementById('password').value = '';
    document.getElementById('passwordConfirm').value = '';
    saveBtn.textContent = 'Save password';
    saveBtn.disabled = false;
  });
}

if (bookBtn) {
  bookBtn.addEventListener('click', (e) => {
    e.target.textContent = 'Processing...';
    const tourId = e.target.getAttribute('data-tour-id');
    bookTour(tourId);
  });
}
