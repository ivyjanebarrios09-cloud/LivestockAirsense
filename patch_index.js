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
  // Temporary workaround: since we don't have a composite index on collectionGroup, 
  // we will just sort client side for now. If there's too much data, we should fetch by device.
  // We can query just by userId. If that also requires an index, we fetch all and filter client side.
  // But wait, collectionGroup where + orderBy definitely requires a composite index.
  // collectionGroup where(userId) requires a single-field index on userId (enabled by default).
  const q = query(
    alertsRef, 
    where('userId', '==', uid)
  );`
);
fs.writeFileSync('src/lib/firebase.ts', code);
