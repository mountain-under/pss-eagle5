import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAzlf5SCgsLSeaqMhBbsxPIbwRGSjJTyik",
  authDomain: "pss-front.firebaseapp.com",
  projectId: "pss-front",
  storageBucket: "pss-front.appspot.com",
  messagingSenderId: "713396776090",
  appId: "1:713396776090:web:fc8187aaf3a975ca62c323",
  measurementId: "G-F2YZSMMXZT"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

console.log('Firebase initialized');

export { app, storage };
