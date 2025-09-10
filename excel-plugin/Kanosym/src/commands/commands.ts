/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global Office */

Office.onReady(() => {
  // If needed, Office.js is ready to be called.
});

/**
 * Shows a notification when the add-in command is executed.
 * @param event
 */
function action(event: Office.AddinCommands.Event) {
  const message: Office.NotificationMessageDetails = {
    type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
    message: "Performed action.",
    icon: "Icon.80x80",
    persistent: true,
  };

  // Show a notification message.
  Office.context.mailbox.item?.notificationMessages.replaceAsync(
    "ActionPerformanceNotification",
    message
  );

  // Be sure to indicate when the add-in command function is complete.
  event.completed();
}

/**
 * Shows help information about Kanosym custom functions
 * @param event
 */
function showFunctionsHelp(event: Office.AddinCommands.Event) {
  // Show a dialog with custom functions help
  Office.context.ui.displayDialogAsync(
    'https://localhost:3000/functions-help.html',
    { height: 60, width: 80 },
    (result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        console.error('Dialog failed to open:', result.error);
      }
    }
  );

  // Be sure to indicate when the add-in command function is complete.
  event.completed();
}

// Data Import Functions
/**
 * Import portfolio data from selected Excel range
 * @param event
 */
function importPortfolioData(event: Office.AddinCommands.Event) {
  Excel.run(async (context) => {
    try {
      const range = context.workbook.getSelectedRange();
      range.load("values, address");
      
      await context.sync();
      
      // Validate the selected data as portfolio format
      const values = range.values;
      if (values.length < 2 || values[0].length < 2) {
        Office.context.ui.displayDialogAsync(
          'https://localhost:3000/dialogs/error.html?message=Please select a range with at least 2 rows and 2 columns',
          { height: 30, width: 50 }
        );
        event.completed();
        return;
      }
      
      // Show portfolio import configuration dialog
      Office.context.ui.displayDialogAsync(
        `https://localhost:3000/dialogs/portfolio-import.html?range=${encodeURIComponent(range.address)}`,
        { height: 70, width: 80 },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            console.log('Portfolio import dialog opened successfully');
          }
        }
      );
      
    } catch (error) {
      console.error('Error importing portfolio data:', error);
      Office.context.ui.displayDialogAsync(
        `https://localhost:3000/dialogs/error.html?message=${encodeURIComponent('Error importing portfolio data: ' + error)}`,
        { height: 30, width: 50 }
      );
    }
  }).catch((error) => {
    console.error('Excel.run error:', error);
  });

  event.completed();
}

/**
 * Get data from Salesforce
 * @param event
 */
function getDataFromSalesforce(event: Office.AddinCommands.Event) {
  // Show Salesforce connection dialog
  Office.context.ui.displayDialogAsync(
    'https://localhost:3000/dialogs/salesforce-connect.html',
    { height: 70, width: 80 },
    (result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        console.error('Salesforce dialog failed to open:', result.error);
      }
    }
  );

  event.completed();
}

/**
 * Load historical prices for selected assets
 * @param event
 */
function loadHistoricalPrices(event: Office.AddinCommands.Event) {
  Excel.run(async (context) => {
    try {
      const range = context.workbook.getSelectedRange();
      range.load("values, address");
      
      await context.sync();
      
      // Show historical prices configuration dialog
      Office.context.ui.displayDialogAsync(
        `https://localhost:3000/dialogs/historical-prices.html?range=${encodeURIComponent(range.address)}`,
        { height: 60, width: 70 },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            console.log('Historical prices dialog opened successfully');
          }
        }
      );
      
    } catch (error) {
      console.error('Error loading historical prices:', error);
    }
  });

  event.completed();
}

// Analysis Functions
/**
 * Run classical sensitivity analysis
 * @param event
 */
function runClassicalTest(event: Office.AddinCommands.Event) {
  // Show classical test configuration dialog
  Office.context.ui.displayDialogAsync(
    'https://localhost:3000/dialogs/classical-test.html',
    { height: 70, width: 80 },
    (result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        console.error('Classical test dialog failed to open:', result.error);
      }
    }
  );

  event.completed();
}

/**
 * Run hybrid quantum-classical analysis
 * @param event
 */
function runHybridTest(event: Office.AddinCommands.Event) {
  // Show hybrid test configuration dialog
  Office.context.ui.displayDialogAsync(
    'https://localhost:3000/dialogs/hybrid-test.html',
    { height: 70, width: 80 },
    (result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        console.error('Hybrid test dialog failed to open:', result.error);
      }
    }
  );

  event.completed();
}

/**
 * Run quantum sensitivity analysis
 * @param event
 */
function runQuantumTest(event: Office.AddinCommands.Event) {
  // Show quantum test configuration dialog
  Office.context.ui.displayDialogAsync(
    'https://localhost:3000/dialogs/quantum-test.html',
    { height: 70, width: 80 },
    (result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        console.error('Quantum test dialog failed to open:', result.error);
      }
    }
  );

  event.completed();
}

/**
 * Compare Classical, Hybrid, and Quantum methods
 * @param event
 */
function compareAnalysisMethods(event: Office.AddinCommands.Event) {
  // Show comparison configuration dialog
  Office.context.ui.displayDialogAsync(
    'https://localhost:3000/dialogs/compare-methods.html',
    { height: 70, width: 80 },
    (result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        console.error('Compare methods dialog failed to open:', result.error);
      }
    }
  );

  event.completed();
}

// Results Functions
/**
 * Export analysis results to new worksheet
 * @param event
 */
function exportResults(event: Office.AddinCommands.Event) {
  Excel.run(async (context) => {
    try {
      // Check if there are results to export
      const currentSheet = context.workbook.worksheets.getActiveWorksheet();
      currentSheet.load("name");
      
      await context.sync();
      
      // Show export results dialog
      Office.context.ui.displayDialogAsync(
        `https://localhost:3000/dialogs/export-results.html?sheet=${encodeURIComponent(currentSheet.name)}`,
        { height: 60, width: 70 },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            console.log('Export results dialog opened successfully');
          }
        }
      );
      
    } catch (error) {
      console.error('Error exporting results:', error);
    }
  });

  event.completed();
}

/**
 * Generate comprehensive analysis report
 * @param event
 */
function generateReport(event: Office.AddinCommands.Event) {
  Excel.run(async (context) => {
    try {
      const currentSheet = context.workbook.worksheets.getActiveWorksheet();
      currentSheet.load("name");
      
      await context.sync();
      
      // Show report generation dialog
      Office.context.ui.displayDialogAsync(
        `https://localhost:3000/dialogs/generate-report.html?sheet=${encodeURIComponent(currentSheet.name)}`,
        { height: 60, width: 70 },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            console.log('Generate report dialog opened successfully');
          }
        }
      );
      
    } catch (error) {
      console.error('Error generating report:', error);
    }
  });

  event.completed();
}

// Register all the functions with Office
Office.actions.associate("action", action);
Office.actions.associate("showFunctionsHelp", showFunctionsHelp);

// Data Import Functions
Office.actions.associate("importPortfolioData", importPortfolioData);
Office.actions.associate("getDataFromSalesforce", getDataFromSalesforce);
Office.actions.associate("loadHistoricalPrices", loadHistoricalPrices);

// Analysis Functions
Office.actions.associate("runClassicalTest", runClassicalTest);
Office.actions.associate("runHybridTest", runHybridTest);
Office.actions.associate("runQuantumTest", runQuantumTest);
Office.actions.associate("compareAnalysisMethods", compareAnalysisMethods);

// Results Functions
Office.actions.associate("exportResults", exportResults);
Office.actions.associate("generateReport", generateReport);
