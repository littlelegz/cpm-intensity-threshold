import { createContext, useState } from 'react';

export const graphContext = createContext();

export const GraphProvider = ({ children }) => {
  const [crosshairValues, setCrosshairValues] = useState(null);
  const [hoverValues, setHoverValues] = useState(null);
  const [zoomBounds, setZoomBounds] = useState(null);

  return (
    <graphContext.Provider value={{
      crosshairValues, setCrosshairValues, hoverValues, setHoverValues
      , zoomBounds, setZoomBounds
    }}>
      {children}
    </graphContext.Provider>
  );
};