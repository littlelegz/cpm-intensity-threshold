import { useState, useEffect } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Chip, OutlinedInput } from '@mui/material';
import { Button, Box, Typography } from '@mui/material';
import './App.css';
import ScatterPlot from './components/scatter';
import { GraphProvider } from './components/graphContext';
import StatGraphs from './components/statGraphs';

const App = () => {
  const [data, setData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [selectedStates, setSelectedStates] = useState([]);
  const [showLoadedMessage, setShowLoadedMessage] = useState(false);

  // Handle "loaded # samples" display
  useEffect(() => {
    if (data) {
      setShowLoadedMessage(true);
      const timer = setTimeout(() => {
        setShowLoadedMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [data]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split('\t').map(header => header.trim());

      const parsedData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split('\t').map(value => value.trim());
          return headers.reduce((obj, header, index) => {
            obj[header] = header === 'state' ? parseInt(values[index])
              : header === 'cpm' || header === 'intensity' ? parseFloat(values[index])
                : values[index];
            return obj;
          }, {});
        });


      setData(parsedData);
      setFilteredData(parsedData);
      const states = [...new Set(parsedData.map(d => d.state))].sort((a, b) => a - b);
      if (states[0] !== undefined) {
        setSelectedStates(states);
      } else {
        setSelectedStates(null);
      }
      console.log('Loaded data:', parsedData.slice(0, 5)); // Show first 5 entries
    };

    reader.readAsText(file);
  };

  // Handle state selection
  const handleStateChange = (event) => {
    const selected = event.target.value;
    setSelectedStates(selected);
    if (data) {
      setFilteredData(selected.length === 0
        ? data
        : data.filter(d => selected.includes(d.state)));
    }
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
              {showLoadedMessage && (
                <Typography>
                  Loaded {data.length} samples
                </Typography>
              )}

              {/* State filter */}
              {selectedStates && (
                <FormControl sx={{ m: 1, width: 200, minWidth: 120 }} size="small">
                  <InputLabel id="state-select-label">States</InputLabel>
                  <Select
                    labelId="state-select-label"
                    id="state-select"
                    multiple
                    size="small"
                    value={selectedStates}
                    onChange={handleStateChange}
                    input={<OutlinedInput label="States" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={`S${value}`}
                            size="small"
                          />
                        ))}
                      </Box>
                    )}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300
                        }
                      }
                    }}
                  >
                    {[...new Set(data.map(d => d.state))].sort((a, b) => a - b).map((state) => (
                      <MenuItem key={state} value={state} dense>
                        State {state}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

            </div>
            {/* Update components to use filteredData instead of data */}
            <ScatterPlot data={filteredData} />
            <StatGraphs data={filteredData} />
          </GraphProvider>
        )}
      </Box>
    </div >
  );
};

export default App;