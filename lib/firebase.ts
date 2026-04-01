import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCTC0aDdH-2RO41ob_Wi63tF6i5FzTXBPU',
  authDomain: 'faircare-4a3bb.firebaseapp.com',
  projectId: 'faircare-4a3bb',
  storageBucket: 'faircare-4a3bb.firebasestorage.app',
  messagingSenderId: '982437239424',
  appId: '1:982437239424:web:67348accb6cc57fb232465',
  measurementId: 'G-F7Z8JSTVYB',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
