import { showAlert } from './alert';
import axios from 'axios';

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    const result = await axios({
      method: 'post',
      url: '/api/v1/users/signup',
      data: {
        name,
        email,
        password,
        passwordConfirm
      }
    });
    console.log(result);
    if (result.data.status === 'success') {
      setTimeout(() => {
        showAlert(
          'success',
          `An email has been sent to your email.\n Please check your inbox or spam folder!`
        );
      }, 3000);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
