const axios = require('axios');

async function checkSessions() {
  const url = 'https://hospital-managemnt-system.vercel.app/api/v1/sessions/';
  try {
    const res = await axios.get(url);
    console.log('Sessions Count:', res.data.data?.length);
    if (res.data.data?.length > 0) {
      console.log('First Session Sample:', JSON.stringify(res.data.data[0], null, 2));
    }
    
    // Check doctor ids
    const doctorIds = res.data.data?.map(s => s.doctor_id || s.doctor?.doctor_id || s.doctor?.id);
    console.log('Unique Doctor IDs in sessions:', [...new Set(doctorIds)]);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkSessions();
