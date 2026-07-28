const GOOGLE_SHEETS = {
  employees: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=0&single=true&output=csv",
  hsxk: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=576188616&single=true&output=csv",
  nhanDangKy: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=1614516186&single=true&output=csv",
  nhanSanXuat: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=21836232&single=true&output=csv",
  hsbsTrongNuoc: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=896924483&single=true&output=csv",
  hsghTrongNuoc: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=336185690&single=true&output=csv",
  hsmTrongNuoc: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=635241150&single=true&output=csv",
  hstdTrongNuoc: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnx4AEoV7IXxPf2o4QD5igDIZo9TPYKsVy0Z30bUAC796GQGNKCkpZCZ9LTbJySoWa1N1FiysKRjNv/pub?gid=1785319964&single=true&output=csv",
  hsxkCap: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRgqEYdBrrFWe4YlLzG6Ossm_RrNVr3cdGUKwBGI43-9WYC9Vq01bhP6PQh0gpVYUAj3vQijYo8PyEm/pub?gid=714926098&single=true&output=csv",
  xepHang: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRgqEYdBrrFWe4YlLzG6Ossm_RrNVr3cdGUKwBGI43-9WYC9Vq01bhP6PQh0gpVYUAj3vQijYo8PyEm/pub?gid=661586433&single=true&output=csv"
};

async function testFetchAll() {
  console.log("Fetching all sheets...");
  for (const key of Object.keys(GOOGLE_SHEETS)) {
    try {
      const res = await fetch(`${GOOGLE_SHEETS[key]}&t=${Date.now()}`);
      if (!res.ok) {
        console.error(`❌ FAILED: ${key} Status: ${res.status}`);
      } else {
        const text = await res.text();
        console.log(`✓ OK: ${key} (${text.length} bytes)`);
      }
    } catch (err) {
      console.error(`❌ FAILED: ${key}:`, err.message);
    }
  }
}

testFetchAll();
