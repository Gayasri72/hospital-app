
const axios = require('axios');

async function checkDoctor() {
  const baseUrl = 'https://hospital-managemnt-system.vercel.app/api/v1';
  try {
    const res = await axios.get(`${baseUrl}/doctors/`);
    console.log('Doctor list sample:', JSON.stringify(res.data.data[0], null, 2));
    
    if (res.data.data[0]) {
      const id = res.data.data[0].doctor_id;
      const resSingle = await axios.get(`${baseUrl}/doctors/${id}`);
      console.log('Single doctor sample:', JSON.stringify(resSingle.data.data, null, 2));
    }
  } catch (err) {
    console.error('Error fetching doctors:', err.message);
    if (err.response) {
       console.error('Response status:', err.response.status);
       console.error('Response data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

checkDoctor();
