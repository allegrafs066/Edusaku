import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL_KEY = '@edusaku_server_url';

export const saveServerUrl = async (url: string) => {
  try {
    await AsyncStorage.setItem(SERVER_URL_KEY, url);
  } catch (e) {
    console.error('Error saving server URL', e);
  }
};

export const getServerUrl = async () => {
  try {
    return await AsyncStorage.getItem(SERVER_URL_KEY);
  } catch (e) {
    console.error('Error getting server URL', e);
    return null;
  }
};

export const clearServerUrl = async () => {
  try {
    await AsyncStorage.removeItem(SERVER_URL_KEY);
  } catch (e) {
    console.error('Error clearing server URL', e);
  }
};
