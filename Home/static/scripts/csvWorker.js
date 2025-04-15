// csvWorker.js
self.onmessage = function(e) {
    const [label, csvText] = e.data;
    const rows = csvText.trim().split("\n");
    const headers = rows[0].split(",");
  
    const data = rows.slice(1).map(row => {
      const values = row.split(",");
      const obj = {};
      headers.forEach((header, i) => {
        obj[header.trim()] = values[i]?.trim();
      });
      return obj;
    });
  
    self.postMessage([label, data]);
  };
  