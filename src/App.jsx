import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Box, Typography } from '@mui/material';
import './App.css';
import ScatterPlot from './components/scatter';
import { GraphProvider } from './components/graphContext';
import StatGraphs from './components/statGraphs';

const App = () => {
  const [data, setData] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split('\t');

      const parsedData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split('\t');
          return headers.reduce((obj, header, index) => {
            obj[header] = header === 'state' ? parseInt(values[index])
              : header === 'cpm' || header === 'intensity' ? parseFloat(values[index])
                : values[index];
            return obj;
          }, {});
        });


      setData(parsedData);
      console.log('Loaded data:', parsedData.slice(0, 5)); // Show first 5 entries
    };

    reader.readAsText(file);
  };

  return (
    <div className="content">
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <input
            accept=".txt,.tsv"
            style={{ display: 'none' }}
            id="raised-button-file"
            type="file"
            onChange={handleFileUpload}
          />
          <label htmlFor="raised-button-file">
            <Button variant="contained" component="span">
              Upload Data
            </Button>
          </label>
        </Box>
        {!data && (
          <>
            Accepts .txt or .tsv files with the following columns: <br />
            <strong>name</strong>, <strong>cpm</strong>, <strong>intensity</strong>, <strong>state</strong>
            <br />
          </>
        )}

        {data && (
          <GraphProvider>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column',
              gap: '10px',
              justifyContent: 'space-between'
            }}>
              <Typography>
                Loaded {data.length} samples
              </Typography>
            </div>
            <ScatterPlot data={data} />
            <StatGraphs data={data} />
          </GraphProvider>
        )}
      </Box>
    </div>
  );
};

export default App;