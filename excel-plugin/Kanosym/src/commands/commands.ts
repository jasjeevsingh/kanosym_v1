/* global Office, Excel */

// Add global debugging
console.log('=== COMMANDS.TS LOADING ===');
console.log('Office available:', typeof Office);
console.log('Excel available:', typeof Excel);

Office.onReady(() => {
  console.log('=== COMMANDS.TS OFFICE READY ===');
  // If needed, Office.js is ready to be called.
});

// Test global function to verify script loading
(window as any).testCommandsLoaded = () => {
  console.log('testCommandsLoaded called - commands.js is working!');
  if (typeof Excel !== 'undefined') {
    Excel.run(async (context) => {
      try {
        const worksheet = context.workbook.worksheets.getActiveWorksheet();
        const range = worksheet.getRange("Z9");
        range.values = [["COMMANDS.JS WORKING!"]];
        await context.sync();
        console.log('Successfully wrote to Z9 from commands.js');
      } catch (error) {
        console.error('Error writing to Z9:', error);
      }
    });
  }
};

console.log('=== SIMPLIFIED COMMANDS.TS LOADED ===');

/**
 * Run Classical Test - replaces the "Save Configuration" functionality
 * Now performs actual classical sensitivity analysis via backend API
 */
async function runClassicalTest() {
  console.log('=== RUN CLASSICAL TEST FUNCTION CALLED ===');
  
  try {
    await Excel.run(async (context) => {
      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z1');
      range.values = [['BUTTON CLICKED - ADDIN WORKS!']];
      await context.sync();
    });

    // Show classical test configuration dialog
    Office.context.ui.displayDialogAsync(
      'https://localhost:3000/dialogs/classical-test.html',
      { height: 70, width: 80 },
      async (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          await Excel.run(async (context) => {
            const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z4');
            range.values = [['DIALOG OPENED SUCCESSFULLY']];
            await context.sync();
          });
          
          // Add event handler with additional debugging
          result.value.addEventHandler(Office.EventType.DialogMessageReceived, async (arg) => {
            try {
              await Excel.run(async (context) => {
                const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z5');
                range.values = [['*** MESSAGE RECEIVED FROM DIALOG ***']];
                await context.sync();
              });
              console.log('Dialog message received:', arg);
              
              // Type guard for arg
              if ('message' in arg) {
                await Excel.run(async (context) => {
                  const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z6');
                  range.values = [['Message has content']];
                  await context.sync();
                });
                console.log('Raw message:', arg.message);
                
                const messageData = JSON.parse(arg.message);
                await Excel.run(async (context) => {
                  const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z7');
                  range.values = [[`Parsed message action: ${messageData.action}`]];
                  await context.sync();
                });
                console.log('Parsed message data:', messageData);
                
                if (messageData.action === 'test') {
                  await Excel.run(async (context) => {
                    const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z1');
                    range.values = [['TEST MESSAGE RECEIVED!']];
                    await context.sync();
                  });
                  return; // Don't continue processing for test messages
                }
                
                if (messageData.action === 'run_analysis') {
                  await Excel.run(async (context) => {
                    const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z2');
                    range.values = [['ANALYSIS REQUESTED!']];
                    await context.sync();
                  });
                  
                  try {
                    // Call backend API
                    const response = await fetch('http://localhost:5001/api/classical_sensitivity_test', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        symbols: messageData.config?.symbols || ['AAPL', 'MSFT'],
                        initial_investment: messageData.config?.initial_investment || 100000,
                        start_date: messageData.config?.start_date || '2023-01-01',
                        end_date: messageData.config?.end_date || '2024-01-01'
                      })
                    });
                    
                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const testResult = await response.json();
                    
                    await Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z3');
                      range.values = [['BACKEND API SUCCESS!']];
                      await context.sync();
                    });
                    
                    // Close the current dialog
                    result.value.close();
                    
                    // Show results in a new dialog with the actual data
                    const resultsUrl = `https://localhost:3000/dialogs/results.html?data=${encodeURIComponent(JSON.stringify(testResult))}`;
                    Office.context.ui.displayDialogAsync(resultsUrl, { 
                      height: 80, 
                      width: 80, 
                      displayInIframe: false 
                    });
                    
                  } catch (error) {
                    await Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z8');
                      range.values = [[`API ERROR: ${error.message}`]];
                      await context.sync();
                    });
                    
                    // Close dialog and show error
                    result.value.close();
                    Office.context.ui.displayDialogAsync(
                      `https://localhost:3000/dialogs/error.html?message=${encodeURIComponent(error.message)}`,
                      { height: 30, width: 50 }
                    );
                  }
                }
              } else {
                await Excel.run(async (context) => {
                  const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z6');
                  range.values = [['Message has no content']];
                  await context.sync();
                });
              }
            } catch (error) {
              await Excel.run(async (context) => {
                const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z7');
                range.values = [[`Analysis error: ${error.message}`]];
                await context.sync();
              });
              console.error('Dialog message handler error:', error);
              
              // Close current dialog and show error
              try {
                result.value.close();
              } catch (closeError) {
                console.error('Error closing dialog:', closeError);
              }
              
              Office.context.ui.displayDialogAsync(
                `https://localhost:3000/dialogs/error.html?message=${encodeURIComponent(error.message)}`,
                { height: 30, width: 50 }
              );
            }
          });
          
          await Excel.run(async (context) => {
            const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z3');
            range.values = [['Event handler registered for dialog messages']];
            await context.sync();
          });
        } else {
          await Excel.run(async (context) => {
            const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z4');
            range.values = [[`Dialog failed to open: ${result.error?.message || 'Unknown error'}`]];
            await context.sync();
          });
        }
      }
    );
  } catch (error) {
    await Excel.run(async (context) => {
      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z8');
      range.values = [[`Error: ${error.message}`]];
      await context.sync();
    });
    console.error('Error in runClassicalTest:', error);
  }
}

// Assign functions to global object
(global as any).runClassicalTest = runClassicalTest;

// Also assign to window for browser compatibility
if (typeof window !== 'undefined') {
  (window as any).runClassicalTest = runClassicalTest;
}

console.log('=== runClassicalTest FUNCTION REGISTERED ===');
