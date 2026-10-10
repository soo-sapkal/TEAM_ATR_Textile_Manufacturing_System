const fs = require('fs');

let content = fs.readFileSync('lib/auth/permissions.ts', 'utf8');

let newWorkers = '';
const firstNames = ['Amit', 'Raj', 'Sunil', 'Vijay', 'Rahul', 'Anil', 'Sanjay', 'Vikram', 'Prakash', 'Ajay'];
const lastNames = ['Sharma', 'Verma', 'Singh', 'Yadav', 'Gupta', 'Mishra', 'Pandey', 'Tiwari', 'Das', 'Kumar'];

for (let i=1; i<=10; i++) {
  const name = firstNames[i-1] + ' ' + lastNames[i-1];
  newWorkers += `  { id: "u-op-spin-${i}", name: "${name} (Spinning Operator ${i})", email: "op.spin.${i}@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/my-work" },\n`;
}
for (let i=1; i<=10; i++) {
  const name = lastNames[i-1] + ' ' + firstNames[i-1];
  newWorkers += `  { id: "u-op-weav-${i}", name: "${name} (Weaving Operator ${i})", email: "op.weav.${i}@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/my-work" },\n`;
}
for (let i=1; i<=10; i++) {
  const name = firstNames[9-i+1] + ' ' + lastNames[i-1];
  newWorkers += `  { id: "u-op-dye-${i}", name: "${name} (Dyeing Operator ${i})", email: "op.dye.${i}@everest.demo", roles: ["MACHINE_OPERATOR"], permissions: ROLE_PERMISSIONS.MACHINE_OPERATOR.perms, landing: "/my-work" },\n`;
}

content = content.replace('  { id: "u-operator-spinning",', newWorkers + '  { id: "u-operator-spinning",');
fs.writeFileSync('lib/auth/permissions.ts', content);
console.log('Added 30 workers.');
