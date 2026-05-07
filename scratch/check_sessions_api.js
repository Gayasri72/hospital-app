const axios = require('axios');

async function checkSessions() {
  try {
    const res = await axios.get('https://hospital_app_w61r_95ds3llvo_dulsanja9692s.projects.vercel.app/api/v1/sessions?limit=10');
    console.log(JSON.stringify(res.data.data[0], null, 2));
  } catch (err) {
    console.error(err.message);
  }
}

checkSessions();
