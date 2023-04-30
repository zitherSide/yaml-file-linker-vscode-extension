// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as yaml from 'js-yaml'

interface Node {
	id: string;
	label: string;
	shape: string;
	parent?: string;
	path: string;
}

interface Edge {
	from: string;
	to: string;
	arrows?: string;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "yaml-linker" is now active!');
	vscode.window.showInformationMessage('Hello World from yaml-linker!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('yaml-linker.compile', () => {
		const rootDir = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.path : ''
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.workspace.findFiles('**/*.yaml').then(files => {
			let panel = vscode.window.createWebviewPanel('graph-window', 'graph-view', vscode.ViewColumn.Active, {
				enableScripts: true
			})
			const nodes = Promise.all(files.flatMap(f => {
				return vscode.workspace.fs.readFile(vscode.Uri.file(f.path))
					.then(data => Buffer.from(data).toString())
					.then(text => yaml.load(text))
					.then((content: any) => {
						return Object.keys(content).flatMap(key => {
							const node: Node = {
								id: key,
								label: key,
								shape: 'box',
								path: f.path
							}
							if(content[key].parent){
								node.parent = content[key].parent
							}
							return node;
						})
					})
			})).then(nodes => {
				const edges = nodes.flat()
					.filter((n: Node) => n.parent)
					.flatMap((n: Node) => {
						return {
							from: n.parent,
							to: n.id,
							arrows: 'to'
						}
					})
				const htmlPath = vscode.Uri.joinPath(context.extensionUri, 'src/index.html')
				vscode.workspace.fs.readFile(htmlPath)
					.then(buf => buf.toString())
					.then(html => {
						html = html.replace('__NODES__', JSON.stringify(nodes.flat()))
						html = html.replace('__EDGES__', JSON.stringify(edges))
						panel.webview.html = html
						panel.webview.onDidReceiveMessage(message => {
							console.log(JSON.stringify(message))
							vscode.window.showInformationMessage(`${message.uri}`);
							vscode.workspace.openTextDocument(message.uri).then(doc => {
								vscode.window.showTextDocument(doc);
							  });
						})
					})
			})
		})
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
