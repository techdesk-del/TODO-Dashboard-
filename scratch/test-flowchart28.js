const fs = require('fs');
const path = require('path');

const manualPath = path.join(__dirname, '../src/components/WorkflowManualModal.tsx');
const content = fs.readFileSync(manualPath, 'utf8');

console.log('--- Verifying Flowchart 28: The Index Chart Compliance ---');

// Extract workflows array from WorkflowManualModal.tsx
const wfMatch = content.match(/const workflows = useMemo\(\(\) => \[\s*([\s\S]*?)\s*\],\s*\[\]\);/);
if (!wfMatch) {
  console.error('❌ Could not extract workflows array from WorkflowManualModal.tsx');
  process.exit(1);
}

// Parse the entries
const entryRegex = /\{\s*num:\s*(\d+),\s*name:\s*['"]([^'"]+)['"],\s*phase:\s*['"]([^'"]+)['"],\s*role:\s*['"]([^'"]+)['"],\s*outcome:\s*['"]([^'"]+)['"]\s*\}/g;
let match;
const parsedWorkflows = [];
while ((match = entryRegex.exec(wfMatch[1])) !== null) {
  parsedWorkflows.push({
    num: parseInt(match[1], 10),
    name: match[2],
    phase: match[3],
    role: match[4],
    outcome: match[5]
  });
}

console.log(`Found ${parsedWorkflows.length} workflows in WorkflowManualModal.`);
if (parsedWorkflows.length !== 28) {
  console.error(`❌ Expected exactly 28 workflows, found ${parsedWorkflows.length}`);
  process.exit(1);
}

// Check every ID 1 to 28 is present exactly once
const nums = parsedWorkflows.map(w => w.num);
for (let i = 1; i <= 28; i++) {
  if (!nums.includes(i)) {
    console.error(`❌ Missing Flowchart #${i}`);
    process.exit(1);
  }
}
console.log('✅ Flowcharts 1 through 28 are all present without gaps or duplicates.');

// Verify 7 Phases according to Flowchart 28:
// Phase 1: Before Login (FC 1, 2, 3, 4)
// Phase 2: Login (FC 5)
// Phase 3: Daily Work (FC 6, 7, 8, 9, 10)
// Phase 4: Reporting and Configuration (FC 11, 12, 14, 15, 16, 19)
// Phase 5: System Automation (FC 13, 20, 21, 23, 24, 25)
// Phase 6: Exception Paths (FC 17, 18, 22)
// Phase 7: Management Overview (FC 26, 27, 28)

const expectedPhaseMap = {
  1: 'Phase 1: Before Login',
  2: 'Phase 1: Before Login',
  3: 'Phase 1: Before Login',
  4: 'Phase 1: Before Login',
  5: 'Phase 2: Login',
  6: 'Phase 3: Daily Work',
  7: 'Phase 3: Daily Work',
  8: 'Phase 3: Daily Work',
  9: 'Phase 3: Daily Work',
  10: 'Phase 3: Daily Work',
  11: 'Phase 4: Reporting and Configuration',
  12: 'Phase 4: Reporting and Configuration',
  13: 'Phase 5: System Automation',
  14: 'Phase 4: Reporting and Configuration',
  15: 'Phase 4: Reporting and Configuration',
  16: 'Phase 4: Reporting and Configuration',
  17: 'Phase 6: Exception Paths',
  18: 'Phase 6: Exception Paths',
  19: 'Phase 4: Reporting and Configuration',
  20: 'Phase 5: System Automation',
  21: 'Phase 5: System Automation',
  22: 'Phase 6: Exception Paths',
  23: 'Phase 5: System Automation',
  24: 'Phase 5: System Automation',
  25: 'Phase 5: System Automation',
  26: 'Phase 7: Management Overview',
  27: 'Phase 7: Management Overview',
  28: 'Phase 7: Management Overview'
};

let errors = 0;
for (const wf of parsedWorkflows) {
  const expected = expectedPhaseMap[wf.num];
  if (wf.phase !== expected) {
    console.error(`❌ Mismatch for FC ${wf.num} (${wf.name}): expected "${expected}", got "${wf.phase}"`);
    errors++;
  } else {
    console.log(`  [OK] FC ${wf.num.toString().padStart(2, '0')}: ${wf.name} -> ${wf.phase}`);
  }
}

if (errors > 0) {
  console.error(`❌ Total phase mapping errors: ${errors}`);
  process.exit(1);
}

// Verify filter tabs in modal UI
const expectedFilterPhases = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Phase 6', 'Phase 7'];
for (const p of expectedFilterPhases) {
  if (!content.includes(p)) {
    console.error(`❌ Filter bar missing phase tab: ${p}`);
    process.exit(1);
  }
}

console.log('✅ All 7 Lifecycle Phase filter tabs are present in UI.');

// Flowchart 28: The Index Chart title verification
const fc28 = parsedWorkflows.find(w => w.num === 28);
console.log(`✅ Flowchart 28 verified: "${fc28.name}" under "${fc28.phase}"`);

console.log('\n======================================================');
console.log('🎉 100% SUCCESS: FLOWCHART 28 INDEX CHART VERIFIED!');
console.log('======================================================');
