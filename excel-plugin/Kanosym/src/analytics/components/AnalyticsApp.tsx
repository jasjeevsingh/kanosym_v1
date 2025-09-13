import React from 'react';
import {
  Text,
  Card,
  CardHeader,
  CardPreview,
  makeStyles,
  tokens,
  Button,
} from "@fluentui/react-components";
import { TableAdd24Regular, CalculatorMultiple24Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    padding: tokens.spacingVerticalM,
  },
  header: {
    marginBottom: tokens.spacingVerticalL,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: tokens.spacingVerticalM,
    flex: 1,
  },
  card: {
    height: 'fit-content',
  },
  placeholder: {
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    padding: tokens.spacingVerticalXL,
  },
  cardPreview: {
    // Add any specific styling for card preview if needed
  },
});

interface AnalyticsAppProps {
  title: string;
}

export default function AnalyticsApp({ title }: AnalyticsAppProps) {
  const styles = useStyles();

  const handleImportData = async () => {
    try {
      // Excel API call to read worksheet data
      await (window as any).Excel.run(async (context: any) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        const range = sheet.getUsedRange();
        range.load("values");
        
        await context.sync();
        
        console.log("Excel data:", range.values);
        // TODO: Send data to Kanosym backend for analysis
      });
    } catch (error) {
      console.error("Error reading Excel data:", error);
    }
  };

  const handleRunAnalysis = () => {
    // TODO: Implement analysis functionality
    console.log("Running analysis...");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text as="h1" size={600}>{title}</Text>
        <br></br>
        <Text>Financial analytics and sensitivity analysis tools</Text>
      </div>

      <div className={styles.grid}>
        <Card className={styles.card}>
          <CardHeader
            header={<Text weight="semibold">Import Data</Text>}
            action={
              <Button
                icon={<TableAdd24Regular />}
                onClick={handleImportData}
              >
                Import
              </Button>
            }
          />
          <div className={`${styles.cardPreview}`}>
          <CardPreview>
            <Text>
              Import data from your Excel worksheet to run Kanosym analysis.
              Select your data range and click Import to get started.
            </Text>
          </CardPreview>
          </div>
          
        </Card>

        <Card className={styles.card}>
          <CardHeader
            header={<Text weight="semibold">Run Analysis</Text>}
            action={
              <Button
                icon={<CalculatorMultiple24Regular />}
                onClick={handleRunAnalysis}
                disabled={true} // Enable after data import
              >
                Analyze
              </Button>
            }
          />
          <div className={`${styles.cardPreview}`}>
          <CardPreview>
            <Text>
              Run quantum, hybrid, or classical sensitivity analysis on your 
              financial models using Kanosym's advanced algorithms.
            </Text>
          </CardPreview>
          </div>
          
        </Card>

        <Card className={styles.card}>
          <CardHeader header={<Text weight="semibold">Results</Text>} />
          <CardPreview>
            <div className={styles.placeholder}>
              <Text>Analysis results will appear here</Text>
            </div>
          </CardPreview>
        </Card>

        <Card className={styles.card}>
          <CardHeader header={<Text weight="semibold">Visualization</Text>} />
          <CardPreview>
            <div className={styles.placeholder}>
              <Text>Charts and graphs will be displayed here</Text>
            </div>
          </CardPreview>
        </Card>
      </div>
    </div>
  );
}
