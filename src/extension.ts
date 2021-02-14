'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
//import {VSCExpress} from 'vscode-express';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // This line of code will only be executed once when your extension is activated

	let defaultOrg;
	let userName;
	const fs = require('fs');
	const { execSync } = require('child_process');

	let mapNameClass_MapMethodName_Coverage;
	let mapNameClass_TotalCoverage;

	const lime = (opacity: number): string => `rgba(45, 121, 11, ${opacity})`;
	const red = (opacity: number): string => `rgba(253, 72, 73, ${opacity})`;

	let coveredLinesDecorationType = vscode.window.createTextEditorDecorationType(
	{
		backgroundColor: lime(0.3),
		borderRadius: '.2em',
		overviewRulerColor: lime(0.3)
	});

	let uncoveredLinesDecorationType = vscode.window.createTextEditorDecorationType(
	{
		backgroundColor: red(0.3),
		borderRadius: '.2em',
		overviewRulerColor: red(0.3)
	});

    context.subscriptions.push(vscode.commands.registerCommand('extension.getCoverage', () => {

		const openedClass = vscode.window.activeTextEditor;
		if(!openedClass){
			vscode.window.showInformationMessage('Apex Class or Trigger not found');
			return;
		}

		const pathClass = openedClass.document.fileName;

		if(isInvalidFile(pathClass)){
			vscode.window.showInformationMessage('Apex Class or Trigger not found');
			return;
		}

		openedClass.setDecorations(coveredLinesDecorationType, []);
		openedClass.setDecorations(uncoveredLinesDecorationType, []);

		const className = pathClass.substring(pathClass.lastIndexOf("\\")+1,pathClass.lastIndexOf("."));

		const sfdxConfigPath = pathClass.substring(0,pathClass.lastIndexOf("force-app")) + ".sfdx/sfdx-config.json";

		if(!sfdxConfigPath){
			vscode.window.showInformationMessage('sfdx-config.json not found');
			return;
		}

		const json = JSON.parse(fs.readFileSync(sfdxConfigPath));

		let currentSfOrg = json["defaultusername"];

		if(currentSfOrg != defaultOrg){ //L'utente ha cambiato ORG
			mapNameClass_MapMethodName_Coverage = new Map();
			mapNameClass_TotalCoverage = new Map();
			userName = null;
			defaultOrg = currentSfOrg;
			let response = execSync('sfdx force:auth:list --json');
			let jsonResponse = JSON.parse(response);
			for(const accessOrg of jsonResponse.result){
				if(accessOrg.alias == defaultOrg){
					userName = accessOrg.username;
					break;
				}
			}
			if(!userName){
				vscode.window.showInformationMessage('Org not authorized');
				return;
			}
		}

		if(!mapNameClass_MapMethodName_Coverage.has(className)){
			getClassCoverage(className);
		}

		if(!mapNameClass_MapMethodName_Coverage.has(className)){
			vscode.window.showInformationMessage('No Coverage found for this Class/Trigger. Run Test Class!');
			return;
		}

		const REFRESH_DATA = 'Refresh Data';
		const TOTAL_COVERAGE = 'Total Coverage';
		let options = [REFRESH_DATA];
		let recordTotalCoverage = mapNameClass_TotalCoverage.get(className)[0];
		let methodCoverage = (recordTotalCoverage.NumLinesCovered / (recordTotalCoverage.NumLinesCovered + recordTotalCoverage.NumLinesUncovered)) * 100;
		options.push(TOTAL_COVERAGE + ' - ' + methodCoverage.toFixed(2) + '%');

		let mapMethodName_Coverage = mapNameClass_MapMethodName_Coverage.get(className);

		for (const entry of mapMethodName_Coverage.entries()) {
			let methodCoverage = (entry[1].NumLinesCovered / (entry[1].NumLinesCovered + entry[1].NumLinesUncovered)) * 100;
			options.push(entry[0] + ' - ' + methodCoverage.toFixed(2) + '%');
		}

		vscode.window.showQuickPick(options).then(selection => {
			if (!selection) {
			  return;
			}

			let selected = selection.split(' - ')[0].trim();

			if(selection == REFRESH_DATA){
				mapNameClass_MapMethodName_Coverage.delete(className);
				mapNameClass_TotalCoverage.delete(className);
				vscode.commands.executeCommand('extension.getCoverage');
			}else if(selected == TOTAL_COVERAGE){
				highlightCoverage(recordTotalCoverage.Coverage, openedClass);
			}else{
				highlightCoverage(mapMethodName_Coverage.get(selected).Coverage, openedClass);
			}
		});

	}));

	function getClassCoverage(className){
		let query = 'sfdx force:data:soql:query -q "Select ApexTestClass.Name,TestMethodName, NumLinesCovered, NumLinesUncovered, Coverage from ApexCodeCoverage where ApexClassOrTrigger.name = \'' + className + '\' order by createddate desc LIMIT 20" -t -u ' + '"' + userName + '" --json';

		let resultQuery = execSync(query);
		let records = JSON.parse(resultQuery)["result"].records;

		if(records.length > 0){
			let mapMethodName_Coverage = new Map();
			records.forEach(record => {
				mapMethodName_Coverage.set(record.ApexTestClass.Name + '.' + record.TestMethodName, record);
			});

			mapNameClass_MapMethodName_Coverage.set(className, mapMethodName_Coverage);
			getClassTotalCoverage(className);
		}
	}

	function getClassTotalCoverage(className){
		let query = 'sfdx force:data:soql:query -q "SELECT ApexClassOrTrigger.Name, NumLinesCovered, NumLinesUncovered, Coverage FROM ApexCodeCoverageAggregate WHERE ApexClassOrTrigger.Name = \'' + className + '\'" -t -u ' + '"' + userName + '" --json';

		let resultQuery = execSync(query);

		let records = JSON.parse(resultQuery)["result"].records;

		mapNameClass_TotalCoverage.set(className, records);

	}

	function isInvalidFile(pathClass){
		let extension = pathClass.substring(pathClass.lastIndexOf("."));

		let validExtensions = new Set();
		validExtensions.add('.cls');
		validExtensions.add('.trigger');

		if(!pathClass || !validExtensions.has(extension)){
			return true;
		}else{
			return false;
		}
	}

	function getRange(lines){
		let coveredRange = [];
		const Max_VALUE = 1000;
		for(const line of lines){
			let range = new vscode.Range((line-1),0,(line-1),Max_VALUE);
			coveredRange.push(range);
		}
		return coveredRange;
	}

	function highlightCoverage(coverageObject, openedClass){
		let coveredRange = getRange(coverageObject.coveredLines);
		let uncoveredRange = getRange(coverageObject.uncoveredLines);

		openedClass.setDecorations(coveredLinesDecorationType, coveredRange);
		openedClass.setDecorations(uncoveredLinesDecorationType, uncoveredRange);
	}
}

// this method is called when your extension is deactivated
export function deactivate() {
}

