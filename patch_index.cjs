const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');
code = code.replace(
`  const alertsRef = collectionGroup(db, 'alertReadings');
  const q = query(
    alertsRef, 
    where('userId', '==', uid),
    orderBy('timestamp', 'desc')
  );`,
`  const alertsRef = collectionGroup(db, 'alertReadings');
  const q = query(
    alertsRef, 
    where('userId', '==', uid)
  );`
);
fs.writeFileSync('src/lib/firebase.ts', code);
