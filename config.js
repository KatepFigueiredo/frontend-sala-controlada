const API_URL = window.location.hostname === 'localhost' 
  ? 'http://192.168.68.55:5000'
  : 'http://192.168.68.55:5000';

console.log('API URL:', API_URL);

export { API_URL };