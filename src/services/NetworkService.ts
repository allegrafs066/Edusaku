import axios from 'axios';

export const pingServer = async (baseUrl: string) => {
  try {
    const response = await axios.get(`${baseUrl}/ping`, { timeout: 3000 });
    return response.data;
  } catch (error) {
    console.error('Ping failed', error);
    throw error;
  }
};
