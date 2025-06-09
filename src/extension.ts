import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs   from 'fs';
import * as path from 'path';

type FormData10 = {
  field1: string; field2: string; field3: string; field4: string; field5: string;
  field6: string; field7: string; field8: string; field9: string; field10: string;
};

export function activate(context: vscode.ExtensionContext) {
  // Show-panel command
  context.subscriptions.push(
    vscode.commands.registerCommand('inputPanel.show', () => {
      InputPanel.reveal(context);
    })
  );

  // Map of field → keybinding digit (used only for command IDs here)
  for (let i = 1; i <= 10; i++) {
    const commandId = `inputPanel.fillField${i}`;
    context.subscriptions.push(
      vscode.commands.registerCommand(commandId, () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) { return; }

        const text = editor.document.getText(editor.selection);
        if (!text) {
          vscode.window.showInformationMessage('No text selected.');
          return;
        }

        InputPanel.reveal(context, () => InputPanel.current?.setField(i, text));
      })
    );
  }
}

class InputPanel {
  static current: InputPanel | undefined;

  /** Bring the panel to front or create it, then optionally run a callback */
  static reveal(context: vscode.ExtensionContext, afterShow?: () => void) {
    if (InputPanel.current) {
      InputPanel.current.panel.reveal();
      afterShow?.();
      return;
    }
    InputPanel.current = new InputPanel(context, afterShow);
  }

  private constructor(
    private readonly context: vscode.ExtensionContext,
    afterShow?: () => void
  ) {
    // this.panel = vscode.window.createWebviewPanel(
    //   'inputPanel',
    //   'Input Form',
    //   vscode.ViewColumn.Beside,
    //   {
    //     enableScripts: true,
    //     localResourceRoots: [
    //       vscode.Uri.joinPath(context.extensionUri, 'media')
    //     ]
    //   }
    // );
    this.panel = vscode.window.createWebviewPanel(
    'inputPanel',
    'Input Form',
    vscode.ViewColumn.Active,   // 👈 use the *current* tab, not Beside
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'media')
      ]
    }
  );
    // HTML
    this.panel.webview.html = getWebviewContent(this.panel.webview, context);

    // Handle messages FROM the webview
    // this.panel.webview.onDidReceiveMessage(msg => {
    //   if (msg.command === 'submit') {
    //     msg.payload.missing.length
    //       ? vscode.window.showErrorMessage(
    //           `Missing required fields: ${msg.payload.missing.join(', ')}`
    //         )
    //       : vscode.window.showInformationMessage('Form submitted successfully!');
    //   }
    // });
    this.panel.webview.onDidReceiveMessage(async msg => {
  if (msg.command !== 'submit') { return; }

  const data = msg.payload.data as FormData10;

  // ❶ Save in workspaceState for any other commands to read
  await this.context.workspaceState.update('inputPanel.formData', data);

  // ❷ Immediately write/patch my_test_env.yaml
  try {
    await writeYaml(data);
    vscode.window.showInformationMessage('YAML updated successfully!');
  } catch (err: any) {
    vscode.window.showErrorMessage(`YAML update failed: ${err.message}`);
  }
});


    // Clean up
    this.panel.onDidDispose(() => (InputPanel.current = undefined));

    afterShow?.();
  }

  readonly panel: vscode.WebviewPanel;

  /** Push text into a specific field (1-based) inside the webview */
  setField(index: number, value: string) {
    this.panel.webview.postMessage({ command: 'setField', index, value });
  }
}

/* ---------------------------------------------------------- */
/* ------------------  HTML  helper  ------------------------- */
/* ---------------------------------------------------------- */

function getWebviewContent(
  webview: vscode.Webview,
  context: vscode.ExtensionContext
): string {
  const nonce = getNonce();

  // URIs for local assets
  const resetCssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'reset.css')
  );
  const vscodeCssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'vscode.css')
  );
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'main.js')
  );

  // Build the 10 inputs
  const formFields = Array.from({ length: 10 }, (_, i) => {
    const idx = i + 1;
    const required = idx <= 5 ? 'required' : '';
    const star = idx <= 5 ? '<span style="color:red;">*</span>' : '';
    return `
      <div class="field">
        <label>Field ${idx} ${star}
          <input type="text" name="field${idx}" ${required}/>
        </label>
      </div>`;
  }).join('\n');

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none';
                 style-src ${webview.cspSource};
                 script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <link href="${resetCssUri}"  rel="stylesheet" />
  <link href="${vscodeCssUri}" rel="stylesheet" />

  <title>Input Form</title>
</head>
<body>
  <h2>Provide Details</h2>
  <form id="inputForm">
    ${formFields}
    <button type="submit">Submit</button>
  </form>

  <script src="${scriptUri}" nonce="${nonce}"></script>
</body>
</html>`;
}

function getNonce(): string {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () =>
    possible.charAt(Math.floor(Math.random() * possible.length))
  ).join('');
}
async function writeYaml(data: FormData10) {
  const ws = vscode.workspace.workspaceFolders?.[0];
  if (!ws) { throw new Error('Open a workspace folder first.'); }

  const yamlPath = path.join(ws.uri.fsPath, 'my_test_env.yaml');

  // Parse existing YAML or start fresh
  let doc: any = {};
  if (fs.existsSync(yamlPath)) {
    doc = yaml.load(fs.readFileSync(yamlPath, 'utf8')) ?? {};
  }

  // Map form fields to YAML keys
  const map: Record<keyof FormData10, string> = {
    field1: 'user_name',
    field2: 'user_email',
    field3: 'DUT',
    field4: 'file_location',
    field5: 'area',
    field6: 'target',
    field7: 'feature',
    field8: 'XPaths',
    field9: 'argument',
    field10:'istuff'
  };

  for (const [field, key] of Object.entries(map)) {
    doc[key] = (data as any)[field];
  }

  const out = yaml.dump(doc, { indent: 2, lineWidth: 120 });
  fs.writeFileSync(yamlPath, out, 'utf8');
}


// async function writeYaml(data: FormData10) {
//   const ws = vscode.workspace.workspaceFolders?.[0];
//   if (!ws) { throw new Error('Open a workspace folder first.'); }

//   const yamlPath = path.join(ws.uri.fsPath, 'my_test_env.yaml');

//   // Parse existing YAML or start fresh
//   let doc: any = {};
//   if (fs.existsSync(yamlPath)) {
//     doc = yaml.load(fs.readFileSync(yamlPath, 'utf8')) ?? {};
//   }

//   // Map form fields to YAML keys
//   const map: Record<keyof FormData10, string> = {
//     field1: 'user_name',
//     field2: 'user_email',
//     field3: 'DUT',
//     field4: 'file_location',
//     field5: 'area',
//     field6: 'target',
//     field7: 'feature',
//     field8: 'XPaths',
//     field9: 'argument',
//     field10:'istuff'
//   };

//   for (const [field, key] of Object.entries(map)) {
//     doc[key] = (data as any)[field];
//   }

//   const out = yaml.dump(doc, { indent: 2, lineWidth: 120 });
//   fs.writeFileSync(yamlPath, out, 'utf8');
// }

export function deactivate() {}
