function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push("");
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(row);
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }
  return lines;
}

const GOOGLE_SHEETS = {
  employees: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=0&single=true&output=csv",
  hsxk: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=576188616&single=true&output=csv",
  nhanDangKy: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=1614516186&single=true&output=csv",
  nhanSanXuat: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=21836232&single=true&output=csv",
  hsbsTrongNuoc: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=896924483&single=true&output=csv"
};

async function check() {
  for (const [key, url] of Object.entries(GOOGLE_SHEETS)) {
    try {
      const res = await fetch(`${url}&t=${Date.now()}`);
      const text = await res.text();
      const rows = parseCSV(text);
      console.log(`=== ${key} ===`);
      console.log("Header (Row 0):", rows[0]);
      console.log("Sample (Row 1):", rows[1]);
      console.log("Sample (Row 2):", rows[2]);
    } catch (err) {
      console.error(`Error fetching ${key}:`, err.message);
    }
  }
}

check();
