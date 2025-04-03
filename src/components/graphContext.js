import { createContext, useState } from 'react';

export const graphContext = createContext();

export const GraphProvider = ({ children }) => {
  const [crosshairValues, setCrosshairValues] = useState(null);
  const [hoverValues, setHoverValues] = useState(null);
  const [zoomBounds, setZoomBounds] = useState(null);

  const clearState = () => {
    setCrosshairValues(null);
    setHoverValues(null);
    setZoomBounds(null);
  }

  return (
    <graphContext.Provider value={{
      crosshairValues, setCrosshairValues, hoverValues, setHoverValues
      , zoomBounds, setZoomBounds,
       clearState
    }}>
      {children}
    </graphContext.Provider>
  );
};