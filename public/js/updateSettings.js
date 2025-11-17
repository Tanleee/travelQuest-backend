import axios from 'axios';
import { showAlert } from './alert';

// type is 'data' or 'password'
export const updateSettings = async (data, type) => {
  try {
    const url =
      type === 'data'
        ? '/api/v1/users/updateMe'
        : '/api/v1/users/updateMyPassword';

    const result = await axios({
      method: 'PATCH',
      url: url,
      data: data
    });

    if (result.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully!`);
      setTimeout(() => location.reload(), 2000);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
