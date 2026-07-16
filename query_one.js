const { initializeApp } = require('firebase/app');
const { getFirestore, collectionGroup, getDocs, query, limit } = require('firebase/firestore');

const app = initializeApp({
  projectId: "livestockairsense",
  appId: "1:40896854963:web:28b33b7405ed78188229c6",
  apiKey: "AIzaSyCVKH_r4VfUrBsiA0RACVG6G3-AOpHbJf4",
  authDomain: "livestockairsense.firebaseapp.com"
});
const db = getFirestore(app);

async function run() {
  try {
    const q = query(collectionGroup(db, 'alertReadings'), limit(5));
    const snap = await getDocs(q);
    snap.forEach(doc => console.log(doc.id, JSON.stringify(doc.data(), null, 2)));
  } catch(e) {}
}
run();
