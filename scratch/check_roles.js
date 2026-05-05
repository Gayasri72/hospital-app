const axios = require('axios');
const BASE_URL = 'https://hospital-managemnt-system.vercel.app/api/v1';

async function checkUsers() {
  try {
    // We need a token. I'll try to get one from the env or something.
    // But I don't have a token.
    // I'll try to list roles instead, maybe it's public?
    const res = await axios.get(BASE_URL + '/admin/roles');
    console.log('Roles:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('Failed to fetch roles:', err.message);
  }
}
checkUsers();
