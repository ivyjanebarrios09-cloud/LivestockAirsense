const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const app = initializeApp({
  projectId: "livestockairsense",
  appId: "1:40896854963:web:28b33b7405ed78188229c6",
  apiKey: "AIzaSyCVKH_r4VfUrBsiA0RACVG6G3-AOpHbJf4",
  authDomain: "livestockairsense.firebaseapp.com"
});
const db = getFirestore(app);

async function run() {
  try {
    const snap = await getDocs(collection(db, 'users', 'WxdWO7ejVqPzbY5ucyjHOUXfbLI2', 'devices', 'LAS-001', 'alerts', '2026-07-14', 'alertReadings'));
    console.log('2026-07-14 documents:', snap.size);
    let count = 0;
    snap.forEach(doc => {
      if(count++ < 3) console.log(doc.id, doc.data());
    });

    const d = new Date().toISOString().split('T')[0];
    const snap2 = await getDocs(collection(db, 'users', 'WxdWO7ejVqPzbY5ucyjHOUXfbLI2', 'devices', 'LAS-001', 'alerts', d, 'alertReadings'));
    console.log('today documents:', snap2.size);
    count = 0;
    snap2.forEach(doc => {
      if(count++ < 3) console.log(doc.id, doc.data());
    });
  } catch (err) {
    console.error(err);
  }
}
run();
