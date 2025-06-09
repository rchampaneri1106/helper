# Input Panel VS Code Extension

This sample extension opens a side panel (webview) containing a form with **10 input fields**, of which the **first 5 are required**.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Compile once (or rely on the watch task that runs automatically when you press **F5**):

```bash
npm run compile
```

3. Hit **F5** in VS Code to launch the Extension Development Host.

4. Press **⇧⌘P / Ctrl+Shift+P** and run **“Show Input Panel”** (or bind it to a key) to open the side panel.

5. Fill the form and hit **Submit**. Required field validation is enforced, and results are surfaced via VS Code notifications.

## How It Works

* `src/extension.ts` registers the `inputPanel.show` command.
* A `WebviewPanel` is created in the **Beside** column, containing an HTML form.
* The first five inputs have the `required` attribute. On submit, a script checks for missing fields and posts a message back to the extension, which shows success or error toasts.

Feel free to adapt CSS/JS as you see fit!
