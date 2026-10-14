const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const htmlPath = path.resolve(__dirname, '..', 'UrbanGaon_Todos_Implementation_Audit_Report.html');
const pdfPath = path.resolve(__dirname, '..', 'UrbanGaon_Todos_Implementation_Audit_Report.pdf');

console.log('HTML Input:', htmlPath);
console.log('PDF Output:', pdfPath);

const args = [
  '--headless',
  '--disable-gpu',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  `file:///${htmlPath.replace(/\\/g, '/')}`
];

execFile(edgePath, args, (error, stdout, stderr) => {
  if (error) {
    console.error('Edge execution error:', error);
    process.exit(1);
  }
  setTimeout(() => {
    if (fs.existsSync(pdfPath)) {
      const stats = fs.statSync(pdfPath);
      console.log('SUCCESS! PDF generated successfully:', pdfPath, `(${stats.size} bytes)`);
    } else {
      console.error('PDF file not found after generation attempt.');
      process.exit(1);
    }
  }, 1000);
});
