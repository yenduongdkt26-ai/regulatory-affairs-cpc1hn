async function checkHsxk() {
  const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=576188616&single=true&output=csv";
  const res = await fetch(`${url}&t=${Date.now()}`);
  const text = await res.text();
  const rows = text.split('\n').map(r => r.split(','));
  console.log("HSXK total rows:", rows.length);
  console.log("Row 0:", rows[0]);
  console.log("Row 1:", rows[1]);
  console.log("Row 2:", rows[2]);
  console.log("Non empty rows count:", rows.filter(r => r.some(c => c.trim())).length);
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    console.log(`Row ${i}:`, rows[i]);
  }
}
checkHsxk();
