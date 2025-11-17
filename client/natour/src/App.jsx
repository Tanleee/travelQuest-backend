import React from 'react';
import { useEffect } from 'react';
import { useState } from 'react';

function App() {
  const [state, setState] = useState([]);

  useEffect(function () {
    async function fetchData() {
      const res = await fetch('http://127.0.0.1:3000/');
      if (!res.ok) {
        throw new Error('Something wrong when fetching data.');
      }
      const data = await res.json();
      console.log(data.tours);
      setState(data.tours);
    }
    fetchData();
  }, []);

  return state.map((tour) => <div key={tour.id}>{tour.name}</div>);
}

export default App;
