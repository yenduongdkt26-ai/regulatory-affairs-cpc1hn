/**
 * Formats and copies tabular data to clipboard in both plain text and HTML formats.
 * @param {string[]} headers - Array of header strings
 * @param {any[][]} rows - Array of row cell values
 * @returns {Promise<boolean>} - Promise resolving to true if copy succeeded, else false
 */
export const copyTableToClipboard = async (headers, rows) => {
  // 1. Construct Plain Text (Tab-separated values for spreadsheet pasting)
  const headerText = headers.join('\t');
  const rowsText = rows.map(r => r.map(cell => String(cell || '').replace(/[\r\n\t]+/g, ' ')).join('\t')).join('\n');
  const plainText = `${headerText}\n${rowsText}`;

  // 2. Construct HTML Table with basic CSS styling (for rich-text pasting in Teams/Skype/Word)
  const tableHeadersHtml = headers.map(h => 
    `<th style="border: 1px solid #cbd5e1; padding: 10px; background-color: #f8fafc; font-weight: bold; text-align: left; color: #1e293b; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${h}</th>`
  ).join('');
  
  const tableRowsHtml = rows.map(r => {
    const cellsHtml = r.map(cell => 
      `<td style="border: 1px solid #e2e8f0; padding: 10px; text-align: left; color: #334155; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${String(cell || '').replace(/\n/g, '<br>')}</td>`
    ).join('');
    return `<tr>${cellsHtml}</tr>`;
  }).join('');
  
  const htmlText = `<table style="border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"><thead><tr>${tableHeadersHtml}</tr></thead><tbody>${tableRowsHtml}</tbody></table>`;

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const clipboardData = [
        new ClipboardItem({
          'text/plain': new Blob([plainText], { type: 'text/plain;charset=utf-8' }),
          'text/html': new Blob([htmlText], { type: 'text/html;charset=utf-8' })
        })
      ];
      await navigator.clipboard.write(clipboardData);
      return true;
    } else {
      await navigator.clipboard.writeText(plainText);
      return true;
    }
  } catch (err) {
    console.error('Clipboard copy failed: ', err);
    try {
      await navigator.clipboard.writeText(plainText);
      return true;
    } catch (e) {
      return false;
    }
  }
};
