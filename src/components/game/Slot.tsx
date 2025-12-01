import React from 'react';

interface SlotProps {
  id: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const Slot: React.FC<SlotProps> = ({ id, position }) => {
  const getStyle = (pos: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      width: '300px',
      height: '300px',
      border: '2px solid #39C5BB',
      borderRadius: '50%',
      overflow: 'hidden',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(57, 197, 187, 0.4)',
      zIndex: 20, // Ensure it's above background but maybe below some UI?
      pointerEvents: 'none', // Container shouldn't block clicks, but children (bubbles) should
    };

    // Adjust positions based on the screenshot/requirements
    switch (pos) {
      case 'top-left': 
        return { ...baseStyle, top: '10%', left: '20%' };
      case 'top-right': 
        return { ...baseStyle, top: '10%', right: '20%' };
      case 'bottom-left': 
        return { ...baseStyle, bottom: '10%', left: '20%' };
      case 'bottom-right': 
        return { ...baseStyle, bottom: '10%', right: '20%' };
    }
  };

  return (
    <div id={id} className="game-slot" style={getStyle(position)}>
      {/* Bubbles will be appended here by GameManager */}
    </div>
  );
};
