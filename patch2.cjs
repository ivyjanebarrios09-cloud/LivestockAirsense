const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
`          await addDoc(diagRef, {
            ...latestReading,
            alerts: {`,
`          await addDoc(diagRef, {
            ...latestReading,
            userId: ownerId,
            alerts: {`
);
fs.writeFileSync('server.ts', code);
