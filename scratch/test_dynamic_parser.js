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

function normalizeHeader(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function detectExportColumns(headerRow) {
  const norm = headerRow.map(normalizeHeader);
  
  let inChargeCol = norm.findIndex(h => h.includes("đkt") || h.includes("phu trach"));
  let productNameCol = norm.findIndex(h => h.includes("ten san pham") || h.includes("ten thuoc") || h.includes("san pham"));
  let exportNameCol = norm.findIndex(h => h.includes("ten xuat khau") || (h.includes("xuat khau") && !h.includes("nuoc")));
  let countryCol = norm.findIndex(h => h.includes("nuoc"));
  let deadlineCol = norm.findIndex(h => h.includes("deadline") || h.includes("han"));
  let classificationCol = norm.findIndex(h => h.includes("phan loai"));
  let noteCol = norm.findIndex(h => h.includes("note") || h.includes("ghi chu") || h.includes("qua han") || h.includes("nv dang xu ly"));
  let sttCol = norm.findIndex(h => h === "stt");

  // Fallbacks if not matched by name
  const hasStt = sttCol !== -1 || (norm[0] && norm[0] === "stt");
  const offset = hasStt ? 1 : 0;

  if (inChargeCol === -1) inChargeCol = offset + 0;
  if (productNameCol === -1) productNameCol = offset + 1;
  if (exportNameCol === -1) exportNameCol = offset + 2;
  if (countryCol === -1) countryCol = offset + 3;
  if (deadlineCol === -1) deadlineCol = offset + 4;
  if (classificationCol === -1) classificationCol = offset + 5;
  if (noteCol === -1) noteCol = offset + 6;

  return {
    sttCol: hasStt ? sttCol : -1,
    inChargeCol,
    productNameCol,
    exportNameCol,
    countryCol,
    deadlineCol,
    classificationCol,
    noteCol
  };
}

const GOOGLE_SHEETS = {
  hsxk: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=576188616&single=true&output=csv",
  nhanDangKy: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=1614516186&single=true&output=csv",
  nhanSanXuat: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=21836232&single=true&output=csv"
};

async function test() {
  for (const [key, url] of Object.entries(GOOGLE_SHEETS)) {
    const res = await fetch(`${url}&t=${Date.now()}`);
    const text = await res.text();
    const rows = parseCSV(text);
    const cols = detectExportColumns(rows[0]);
    console.log(`\n=== Detected columns for ${key} ===`, cols);
    if (rows[1]) {
      console.log("Sample Row 1 mapped values:");
      console.log("  In Charge:", rows[1][cols.inChargeCol]);
      console.log("  Product Name:", rows[1][cols.productNameCol]);
      console.log("  Export Name:", rows[1][cols.exportNameCol]);
      console.log("  Country:", rows[1][cols.countryCol]);
      console.log("  Deadline:", rows[1][cols.deadlineCol]);
      console.log("  Classification:", rows[1][cols.classificationCol]);
      console.log("  Note:", rows[1][cols.noteCol]);
    }
  }
}

test();
