/**
 * Opens a new browser window and prints a QR code label for the given order.
 *
 * Uses the lightweight `qrcode` CDN build to avoid bundling it into the main
 * chunk — this function is only ever called on user interaction, not at render.
 *
 * @param {string} vtigerId    - The order's vtiger ID (used as QR content and title).
 * @param {string} [articleCode] - Optional article code shown below the ID.
 */
export function printQRCode(vtigerId, articleCode) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <html>
      <head>
        <title>Print Label — ${vtigerId}</title>
        <style>
          body  { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
          .label { border: 2px solid black; padding: 20px; text-align: center; width: 250px; }
          h2    { margin: 0; font-size: 28px; font-weight: 900; }
          p     { margin: 5px 0; font-weight: bold; text-transform: uppercase; font-size: 12px; }
          .qr   { margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="label">
          <h2>${vtigerId}</h2>
          <p>${articleCode || 'Stock'}</p>
          <div id="qr" class="qr"></div>
          <p style="font-size: 8px;">Scan to Start / Finish Stage</p>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
        <script>
          QRCode.toCanvas(
            document.getElementById('qr'),
            '${vtigerId}',
            { width: 180 },
            function () { window.print(); window.close(); }
          )
        </script>
      </body>
    </html>
  `)

  printWindow.document.close()
}
