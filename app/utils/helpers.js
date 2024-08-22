import CryptoJS from 'crypto-js'
import moment from 'moment';

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const encryptPassword = (message) => {
  const encrypted = CryptoJS.AES.encrypt(message, process.env.NEXT_PUBLIC_ENCRYPT_KEY).toString();
  return encrypted;
};

export const decryptPassword = (encryptedMessage) => {
  const bytes = CryptoJS.AES.decrypt(encryptedMessage, process.env.NEXT_PUBLIC_ENCRYPT_KEY);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return decrypted;
};

 // Helper function to format the date using moment
 export const formatDate = (timestamp) => {
  return moment(timestamp).format('YYYY-MM-DD'); // Format as 'YYYY-MM-DD'
};
