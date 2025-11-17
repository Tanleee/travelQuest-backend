import axios from 'axios';
import { showAlert } from './alert';

export const bookTour = async (tourId) => {
  try {
    const session = await axios({
      method: 'get',
      url: `/api/v1/bookings/checkout-session/${tourId}`
    });
    console.log(session);

    location.href = session.data.session.url;
  } catch (err) {
    showAlert('error', err.message);
  }
};
