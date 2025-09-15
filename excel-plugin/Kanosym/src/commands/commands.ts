/* global Office, Excel */

import { renderSplitButton_unstable } from "@fluentui/react-components";

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
 * Load Historical Prices
 * Now performs actual historical prices via backend API
 */
async function loadHistoricalPrices(event: Office.AddinCommands.Event) {
  console.log('=== LOAD HISTORICAL PRICES FUNCTION CALLED ===');
  
  try {
    await Excel.run(async (context) => {
      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z1');
      range.values = [['BUTTON CLICKED - ADDIN WORKS! historical prices']];
      await context.sync();
    });

    // Show historical prices configuration dialog
    Office.context.ui.displayDialogAsync(
      'https://localhost:3000/dialogs/historical-prices.html',
      { height: 70, width: 80 },
      async (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          await Excel.run(async (context) => {
            const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z4');
            range.values = [['HISTORICAL PRICES DIALOG OPENED SUCCESSFULLY']];
            await context.sync();
          });
          
          // Add event handler for dialog messages
          result.value.addEventHandler(Office.EventType.DialogMessageReceived, async (arg) => {
            try {
              await Excel.run(async (context) => {
                const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z5');
                range.values = [['*** MESSAGE RECEIVED FROM HISTORICAL PRICES DIALOG ***']];
                await context.sync();
              });
              console.log('Historical prices dialog message received:', arg);
              
              // Type guard for arg
              if ('message' in arg) {
                await Excel.run(async (context) => {
                  const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z6');
                  range.values = [['Historical prices message has content']];
                  await context.sync();
                });
                console.log('Raw historical prices message:', arg.message);
                
                const messageData = JSON.parse(arg.message);
                await Excel.run(async (context) => {
                  const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z7');
                  range.values = [[`Parsed historical prices message action: ${messageData.action}`]];
                  await context.sync();
                });
                console.log('Parsed historical prices message data:', messageData);
                
                if (messageData.action === 'test') {
                  await Excel.run(async (context) => {
                    const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z1');
                    range.values = [['HISTORICAL PRICES TEST MESSAGE RECEIVED!']];
                    await context.sync();
                  });
                  return; // Don't continue processing for test messages
                }
                
                if (messageData.action === 'load_historical_prices') {
                  await Excel.run(async (context) => {
                    const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z2');
                    range.values = [['HISTORICAL PRICES REQUESTED!']];
                    await context.sync();
                  });
                  
                  try {
                    // Call backend API for historical prices
                    const response = await fetch('https://localhost:5001/api/historical_prices', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        symbols: messageData.config?.symbols || ['AAPL', 'MSFT', 'GOOGL'],
                        start_date: messageData.config?.start_date || '2023-01-01',
                        end_date: messageData.config?.end_date || '2024-01-01',
                        window: messageData.config?.window || 252
                      })
                    });
                    
                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const priceData = await response.json();
                    
                    await Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z3');
                      range.values = [['HISTORICAL PRICES API SUCCESS!']];
                      await context.sync();
                    });
                    
                    // Close the current dialog
                    result.value.close();
                    
                    // Show results in a new dialog with the actual data
                    const resultsUrl = `https://localhost:3000/dialogs/results.html?data=${encodeURIComponent(JSON.stringify(priceData))}`;
                    Office.context.ui.displayDialogAsync(resultsUrl, { 
                      height: 80, 
                      width: 80, 
                      displayInIframe: false 
                    });
                    
                  } catch (error) {
                    await Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z8');
                      range.values = [[`HISTORICAL PRICES API ERROR: ${error.message}`]];
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
                  range.values = [['Historical prices message has no content']];
                  await context.sync();
                });
              }
            } catch (error) {
              await Excel.run(async (context) => {
                const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z7');
                range.values = [[`Historical prices analysis error: ${error.message}`]];
                await context.sync();
              });
              console.error('Historical prices dialog message handler error:', error);
              
              // Close current dialog and show error
              try {
                result.value.close();
              } catch (closeError) {
                console.error('Error closing historical prices dialog:', closeError);
              }
              
              Office.context.ui.displayDialogAsync(
                `https://localhost:3000/dialogs/error.html?message=${encodeURIComponent(error.message)}`,
                { height: 30, width: 50 }
              );
            }
          });
          
          await Excel.run(async (context) => {
            const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z3');
            range.values = [['Event handler registered for historical prices dialog messages']];
            await context.sync();
          });
        } else {
          await Excel.run(async (context) => {
            const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z4');
            range.values = [[`Historical prices dialog failed to open: ${result.error?.message || 'Unknown error'}`]];
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
    console.error('Error in loadHistoricalPrices:', error);
  } finally {
    event.completed();
    console.log('Historical prices completed');
  }
}


/**
 * Run Classical Test - replaces the "Save Configuration" functionality
 * Now performs actual classical sensitivity analysis via backend API
 */
async function runClassicalTest(event: Office.AddinCommands.Event) {
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
                  
                  //something is wrong here
                  try {
                    // Step 1: Fetch volatility data
                    await Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z9');
                      range.values = [['FETCHING VOLATILITY...']];
                      await context.sync();
                    });
                    
                    // Test proxy connectivity first
                    await Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z25');
                      range.values = [['TESTING PROXY...']];
                      await context.sync();
                    });
                    
                    try {
                      const testResponse = await fetch('/api/test', { method: 'GET' });
                      const testData = await testResponse.json();
                      
                      await Excel.run(async (context) => {
                        const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z26');
                        range.values = [[`Proxy test: ${testData.message}`]];
                        await context.sync();
                      });
                    } catch (testError) {
                      await Excel.run(async (context) => {
                        const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z26');
                        range.values = [[`Proxy test failed: ${testError.message}`]];
                        await context.sync();
                      });
                      throw new Error(`Proxy not working: ${testError.message}`);
                    }
                    
                    // Use proxy through webpack dev server
                    const volatilityResponse = await fetch('/api/fetch_volatility', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        symbols: messageData.config?.symbols || ['AAPL', 'MSFT'],
                        start: messageData.config?.start_date || '2023-01-01',
                        end: messageData.config?.end_date || '2024-01-01',
                        window: 252
                      })
                    });
                    
                    if (!volatilityResponse.ok) {
                      const errorText = await volatilityResponse.text();
                      await Excel.run(async (context) => {
                        const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z27');
                        range.values = [[`Volatility error: ${volatilityResponse.status} - ${errorText}`]];
                        await context.sync();
                      });
                      throw new Error(`Volatility fetch failed: ${volatilityResponse.status} - ${errorText}`);
                    }
                    
                    const volatilityData = await volatilityResponse.json();
                    
                    // Step 2: Fetch correlation matrix
                    await Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z10');
                      range.values = [['FETCHING CORRELATION...']];
                      await context.sync();
                    });
                    
                    const correlationResponse = await fetch('/api/fetch_correlation_matrix', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        symbols: messageData.config?.symbols || ['AAPL', 'MSFT'],
                        start: messageData.config?.start_date || '2023-01-01',
                        end: messageData.config?.end_date || '2024-01-01'
                      })
                    });
                    
                    if (!correlationResponse.ok) {
                      throw new Error(`Correlation fetch failed: ${correlationResponse.status}`);
                    }
                    
                    const correlationData = await correlationResponse.json();
                    
                    // Step 3: Build portfolio
                    await Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z11');
                      range.values = [['BUILDING PORTFOLIO...']];
                      await context.sync();
                    });
                    
                    // Convert volatility object to array
                    const symbols = messageData.config?.symbols || ['AAPL', 'MSFT'];
                    const volatilityArray = symbols.map(symbol => {
                      const vol = volatilityData.volatility[symbol];
                      return typeof vol === 'number' ? vol : 0.2; // Default to 20% if error
                    });
                    
                    const portfolio = {
                      assets: symbols,
                      weights: symbols.map(() => 1.0 / symbols.length), // Equal weights
                      volatility: volatilityArray,
                      correlation_matrix: correlationData.correlation_matrix
                    };
                    
                    // Step 4: Run classical sensitivity test
                    await Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z12');
                      range.values = [['RUNNING SENSITIVITY TEST...']];
                      await context.sync();
                    });
                    
                    //error starts from here
                    const { param, asset, range, steps } = messageData.config || {};
                    let assetIndex = typeof asset === 'number' ? asset : (portfolio.assets || []).indexOf(asset);
                    if (assetIndex < 0) {
                      // fallback: first asset, or handle error
                      assetIndex = 0;
                    }
                    
                    const response = await fetch('/api/classical_sensitivity_test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        portfolio: portfolio,
                        param: 'volatility',
                        asset: portfolio.assets[assetIndex],
                        range: [0.1, 0.3],
                        steps: 10,
                        project_id: 'excel_plugin_test'
                      })
                    });

                    if (!response.ok) {
                      console.error('API Error caught:');
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const testResult = await response.json();
                    
                    await Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z3');
                      range.values = [['BACKEND API SUCCESS!']];
                      await context.sync();
                    });
                    
                    // Mark that we're about to close dialog
                    await Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z4');
                      range.values = [['CLOSING DIALOG...']];
                      await context.sync();
                    });
                    
                    // Close the current dialog
                    result.value.close();
                    
                    
                    console.log('Closing dialog...');
                    setTimeout(async () => {
                      
                    // Mark that we're about to show results dialog
                    Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z5');
                      range.values = [['SHOWING RESULTS DIALOG...']];
                      await context.sync();
                    });
                    
                    
                    // Show results in a new dialog with the actual data
                    
                    const resultsUrl = `https://localhost:3000/dialogs/results.html?data=${encodeURIComponent(JSON.stringify(testResult))}`;
                    
                    // Save testResult to a JSON file via Excel
                    const jsonData = JSON.stringify(testResult, null, 2);
                    
                    // Write JSON data to Excel cells (starting from AA1)
                    await Excel.run(async (context) => {
                      const worksheet = context.workbook.worksheets.getActiveWorksheet();
                      const lines = jsonData.split('\n');
                      const range = worksheet.getRange(`AA1:AA${lines.length}`);
                      range.values = lines.map(line => [line]);
                      await context.sync();
                    });
                    console.log('Test result saved to Excel cells AA1:AA' + JSON.stringify(testResult, null, 2).split('\n').length);

                    Office.context.ui.displayDialogAsync(resultsUrl, { 
                      height: 80, 
                      width: 80, 
                      displayInIframe: false
                    });
                    
                    // Mark that we've called displayDialogAsync
                    Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z6');
                      range.values = [['DIALOG CALLED - CHECK IF IT OPENS']];
                      await context.sync();
                    });
                    }, 1000);
                    
                  } catch (error) {
                    console.error('Full error:', error);
                    
                    await Excel.run(async (context) => {
                      const range = context.workbook.worksheets.getActiveWorksheet().getRange('Z8');
                      range.values = [[`API ERROR: ${error.message}`]];
                      await context.sync();
                    });
                    
                    // Close dialog and show error
                    // this is if run test fails

                    result.value.close();
                    setTimeout(() => {
                    Office.context.ui.displayDialogAsync(
                      `https://localhost:3000/dialogs/error.html?message=${encodeURIComponent(error.message)}`,
                      { height: 30, width: 50 }
                    );
                    }, 1000);
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
                // we are starting here 9/13 everything above should be working; only thing wrong is not parsing json file i believe
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
      range.values = [[`Error help: ${error.message}`]];
      await context.sync();
    });
    console.error('Error in runClassicalTest:', error);
  } finally {
    event.completed();
    console.log('Classical test completed');
  }
}

// Assign functions to global object
(global as any).runClassicalTest = runClassicalTest;
(global as any).loadHistoricalPrices = loadHistoricalPrices;

// Also assign to window for browser compatibility
if (typeof window !== 'undefined') {
  (window as any).runClassicalTest = runClassicalTest;
  (window as any).loadHistoricalPrices = loadHistoricalPrices;
}

console.log('=== runClassicalTest FUNCTION REGISTERED ===');
console.log('=== loadHistoricalPrices FUNCTION REGISTERED ===');
