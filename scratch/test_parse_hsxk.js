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
  if (!headerRow || !Array.isArray(headerRow)) {
    return { sttCol: 0, inChargeCol: 1, productNameCol: 2, exportNameCol: 3, countryCol: 4, deadlineCol: 5, classificationCol: 6, noteCol: 7 };
  }
  
  const norm = headerRow.map(normalizeHeader);
  
  let inChargeCol = norm.findIndex(h => h.includes("dkt") || h.includes("phu trach"));
  let productNameCol = norm.findIndex(h => h.includes("ten san pham") || h.includes("ten thuoc") || h.includes("san pham"));
  let exportNameCol = norm.findIndex(h => h.includes("ten xuat khau") || (h.includes("xuat khau") && !h.includes("nuoc")));
  let countryCol = norm.findIndex(h => h.includes("nuoc"));
  let deadlineCol = norm.findIndex(h => h.includes("deadline") || h.includes("han"));
  let classificationCol = norm.findIndex(h => h.includes("phan loai"));
  let noteCol = norm.findIndex(h => h.includes("note") || h.includes("ghi chu") || h.includes("qua han") || h.includes("nv dang xu ly"));
  let sttCol = norm.findIndex(h => h === "stt");

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

async function testHsxk() {
  const res = await fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=576188616&single=true&output=csv&t=" + Date.now());
  const text = await res.text();
  const rows = parseCSV(text);
  console.log("HSXK total parsed rows:", rows.length);
  console.log("Header (Row 0):", rows[0]);
  const cols = detectExportColumns(rows[0]);
  console.log("Detected Cols:", cols);
  for (let i = 1; i <= 5 && i < rows.length; i++) {
    console.log(`Row ${i}:`, {
      inCharge: rows[i][cols.inChargeCol],
      productName: rows[i][cols.productNameCol],
      exportName: rows[i][cols.exportNameCol],
      country: rows[i][cols.countryCol],
      deadline: rows[i][cols.deadlineCol],
      classification: rows[i][cols.classificationCol]
    });
  }
}

testHsxk();
