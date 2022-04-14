import * as vscode from 'vscode';
const traceFlagStatusMap = {
  'User' : vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 40),
  'Automated Process' : vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 41),
  'Platform Integration User' : vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 42)
}

export function showTraceFlagStatus(tracedEntityType, expirationDate){
  const traceFlagStatus = traceFlagStatusMap[tracedEntityType];
  traceFlagStatus.text = `Db ${tracedEntityType} Exp. (${new Date(expirationDate).toLocaleTimeString()})`;
  traceFlagStatus.show();
}
export function hideTraceFlagStatus(tracedEntityType){
  const traceFlagStatus = traceFlagStatusMap[tracedEntityType];
  traceFlagStatus.hide();
}
export function resetStatusBar(){
  for (let tracedEntityType in traceFlagStatusMap){
    hideTraceFlagStatus(tracedEntityType);
  }
}

export function createButtonLinkSF(){
  const openOnSfBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    200
  );
  openOnSfBarItem.command = 'extension.openOnSaleforce';
  openOnSfBarItem.text =  `$(search-view-icon)`;
  openOnSfBarItem.show();
}

