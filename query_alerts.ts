import { db } from './src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function run() {
  const d = new Date().toISOString().split('T')[0];
  console.log('Fetching for date', d);
  const snap = await getDocs(collection(db, 'users', 'WxdWO7ejVqPzbY5ucyjHOUXfbLI2', 'devices', 'LAS-001', 'alerts', d, 'alertReadings'));
  if (snap.empty) {
    console.log('No documents for today. Trying yesterday...');
    const d2 = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const snap2 = await getDocs(collection(db, 'users', 'WxdWO7ejVqPzbY5ucyjHOUXfbLI2', 'devices', 'LAS-001', 'alerts', d2, 'alertReadings'));
    snap2.forEach(doc => console.log(doc.id, doc.data()));
  } else {
    snap.forEach(doc => console.log(doc.id, doc.data()));
  }
}
run();
