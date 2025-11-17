import { showAlert } from './alert';
import axios from 'axios';

export const login = async (email, password) => {
  try {
    console.log(email, password);
    const result = await axios({
      method: 'post',
      url: '/api/v1/users/login',
      data: {
        email: email,
        password: password
      }
    });

    if (result.data.status === 'success') {
      showAlert('success', 'Log in successfully');
      setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const result = await axios({
      method: 'get',
      url: '/api/v1/users/logout'
    });

    if (result.data.status === 'success') {
      location.assign('/');
      location.reload(true);
    }
  } catch (err) {
    showAlert('error', 'Error logging out. Try again!');
  }
};
