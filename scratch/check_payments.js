
const axios = require('axios');
const api = axios.create({
  baseURL: 'https://hospital-managemnt-system.vercel.app/api/v1/',
  headers: { 'Authorization': 'Bearer ' + process.env.TOKEN }
});

async function check() {
  try {
    const res = await api.get('payments');
    console.log(JSON.stringify(res.data.data[0], null, 2));
  } catch (e) {
    console.error(e.response?.data || e.message);
  }
}
check();
