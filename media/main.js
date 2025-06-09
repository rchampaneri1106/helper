// // media/main.js
// // Runs inside the webview – remembers VS Code API handle
// (function () {
//   const vscode = acquireVsCodeApi();

//   const form = document.getElementById('inputForm');
//   form.addEventListener('submit', (e) => {
//     e.preventDefault();

//     const data = new FormData(form);
//     const missing = [];
//     for (let i = 1; i <= 5; i++) {
//       if (!data.get('field' + i)) {
//         missing.push('Field ' + i);
//       }
//     }

//     vscode.postMessage({
//       command: 'submit',
//       payload: {
//         missing,
//         data: Object.fromEntries(data.entries())
//       }
//     });
//   });
// })();
// media/main.js
(function () {
  const vscode = acquireVsCodeApi();

  // form submit (unchanged)
  const form = document.getElementById('inputForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const missing = [];
    for (let i = 1; i <= 5; i++) {
      if (!data.get('field' + i)) missing.push('Field ' + i);
    }
    vscode.postMessage({ command: 'submit', payload: { missing, data: Object.fromEntries(data.entries()) } });
  });

  // NEW: field-setter
  window.addEventListener('message', (event) => {
    const { command, index, value } = event.data || {};
    if (command === 'setField') {
      const input = document.querySelector(`input[name="field${index}"]`);
      if (input) input.value = value;
    }
  });
})();
