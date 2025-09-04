import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  FluentProvider,
  webLightTheme,
  Card,
  CardHeader,
  CardPreview,
  Text,
  Button,
  Input,
  Label,
  Dropdown,
  Option,
  Spinner,
  MessageBar,
  MessageBarBody,
  makeStyles,
  tokens,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalM,
  },
  formRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalM,
  },
  buttonRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    justifyContent: 'flex-end',
    marginTop: tokens.spacingVerticalL,
  },
});

interface ClassicalTestConfig {
  portfolioRange: string;
  asset: string;
  perturbationParameter: string;
  perturbationRange: [number, number];
  steps: number;
  monteCarloSims: number;
}

function ClassicalTestDialog() {
  const styles = useStyles();
  const [config, setConfig] = useState<ClassicalTestConfig>({
    portfolioRange: '',
    asset: '',
    perturbationParameter: 'volatility',
    perturbationRange: [-0.2, 0.2],
    steps: 50,
    monteCarloSims: 1000,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [availableAssets, setAvailableAssets] = useState<string[]>([]);

  useEffect(() => {
    // Load available assets from the current worksheet
    loadAvailableAssets();
  }, []);

  const loadAvailableAssets = async () => {
    try {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        const usedRange = sheet.getUsedRange();
        usedRange.load("values");
        
        await context.sync();
        
        if (usedRange.values && usedRange.values.length > 0) {
          // Assume first row contains asset names
          const assets = usedRange.values[0].filter(val => val && typeof val === 'string') as string[];
          setAvailableAssets(assets);
          if (assets.length > 0) {
            setConfig(prev => ({ ...prev, asset: assets[0] }));
          }
        }
      });
    } catch (error) {
      console.error('Error loading assets:', error);
      setMessage('Error loading assets from worksheet');
    }
  };

  const handleRunTest = async () => {
    if (!config.asset) {
      setMessage('Please select an asset');
      return;
    }

    setLoading(true);
    setMessage('Running classical sensitivity analysis...');

    try {
      // Call the Kanosym backend API
      const response = await fetch('http://localhost:5001/api/analysis/classical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset: config.asset,
          perturbation_parameter: config.perturbationParameter,
          perturbation_range: config.perturbationRange,
          steps: config.steps,
          monte_carlo_sims: config.monteCarloSims,
          portfolio_range: config.portfolioRange,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Save results to Excel
        await saveResultsToExcel(result.data);
        setMessage('Classical analysis completed successfully!');
        
        // Close dialog after a short delay
        setTimeout(() => {
          Office.context.ui.messageParent('success');
        }, 2000);
      } else {
        setMessage(`Analysis failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error running classical test:', error);
      setMessage(`Error: ${error}`);
    }

    setLoading(false);
  };

  const saveResultsToExcel = async (results: any) => {
    await Excel.run(async (context) => {
      // Create or update results worksheet
      let resultsSheet;
      try {
        resultsSheet = context.workbook.worksheets.getItem('Classical_Results');
      } catch {
        resultsSheet = context.workbook.worksheets.add('Classical_Results');
      }

      // Clear existing content
      const usedRange = resultsSheet.getUsedRange();
      if (usedRange) {
        usedRange.clear();
      }

      // Write headers
      const headers = ['Parameter Value', 'Portfolio Value', 'Sensitivity'];
      resultsSheet.getRange('A1:C1').values = [headers];

      // Write data
      if (results.sensitivity_data && results.sensitivity_data.length > 0) {
        const dataRange = resultsSheet.getRange(`A2:C${results.sensitivity_data.length + 1}`);
        dataRange.values = results.sensitivity_data.map((point: any) => [
          point.parameter_value,
          point.portfolio_value,
          point.sensitivity
        ]);
      }

      // Format as table
      resultsSheet.getRange('A1:C1').format.font.bold = true;
      resultsSheet.getRange('A:C').format.autofitColumns();

      await context.sync();
    });
  };

  const handleCancel = () => {
    Office.context.ui.messageParent('cancel');
  };

  return (
    <FluentProvider theme={webLightTheme}>
      <div className={styles.container}>
        <Card>
          <CardHeader
            header={<Text size={500} weight="semibold">Classical Sensitivity Analysis</Text>}
          />
          <CardPreview>
            <div>
              <div className={styles.formRow}>
                <Label htmlFor="asset-select">Asset</Label>
                <Dropdown
                  id="asset-select"
                  value={config.asset}
                  onOptionSelect={(_, data) => setConfig(prev => ({ ...prev, asset: data.optionValue || '' }))}
                  disabled={loading}
                >
                  {availableAssets.map(asset => (
                    <Option key={asset} value={asset}>{asset}</Option>
                  ))}
                </Dropdown>
              </div>

              <div className={styles.formRow}>
                <Label htmlFor="perturbation-param">Perturbation Parameter</Label>
                <Dropdown
                  id="perturbation-param"
                  value={config.perturbationParameter}
                  onOptionSelect={(_, data) => setConfig(prev => ({ ...prev, perturbationParameter: data.optionValue || 'volatility' }))}
                  disabled={loading}
                >
                  <Option value="volatility">Volatility</Option>
                  <Option value="correlation">Correlation</Option>
                  <Option value="expected_return">Expected Return</Option>
                </Dropdown>
              </div>

              <div className={styles.formRow}>
                <Label htmlFor="min-perturbation">Perturbation Range (Min)</Label>
                <Input
                  id="min-perturbation"
                  type="number"
                  value={config.perturbationRange[0].toString()}
                  onChange={(_, data) => setConfig(prev => ({
                    ...prev,
                    perturbationRange: [parseFloat(data.value) || -0.2, prev.perturbationRange[1]]
                  }))}
                  disabled={loading}
                />
              </div>

              <div className={styles.formRow}>
                <Label htmlFor="max-perturbation">Perturbation Range (Max)</Label>
                <Input
                  id="max-perturbation"
                  type="number"
                  value={config.perturbationRange[1].toString()}
                  onChange={(_, data) => setConfig(prev => ({
                    ...prev,
                    perturbationRange: [prev.perturbationRange[0], parseFloat(data.value) || 0.2]
                  }))}
                  disabled={loading}
                />
              </div>

              <div className={styles.formRow}>
                <Label htmlFor="steps">Number of Steps</Label>
                <Input
                  id="steps"
                  type="number"
                  value={config.steps.toString()}
                  onChange={(_, data) => setConfig(prev => ({ ...prev, steps: parseInt(data.value) || 50 }))}
                  disabled={loading}
                />
              </div>

              <div className={styles.formRow}>
                <Label htmlFor="monte-carlo">Monte Carlo Simulations</Label>
                <Input
                  id="monte-carlo"
                  type="number"
                  value={config.monteCarloSims.toString()}
                  onChange={(_, data) => setConfig(prev => ({ ...prev, monteCarloSims: parseInt(data.value) || 1000 }))}
                  disabled={loading}
                />
              </div>

              {message && (
                <MessageBar intent={message.includes('Error') || message.includes('failed') ? 'error' : 'info'}>
                  <MessageBarBody>{message}</MessageBarBody>
                </MessageBar>
              )}

              <div className={styles.buttonRow}>
                <Button onClick={handleCancel} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  onClick={handleRunTest}
                  disabled={loading || !config.asset}
                >
                  {loading ? <Spinner size="tiny" /> : null}
                  {loading ? 'Running...' : 'Run Analysis'}
                </Button>
              </div>
            </div>
          </CardPreview>
        </Card>
      </div>
    </FluentProvider>
  );
}

// Initialize the dialog
Office.onReady(() => {
  const container = document.getElementById('container');
  if (container) {
    const root = createRoot(container);
    root.render(<ClassicalTestDialog />);
  }
});
