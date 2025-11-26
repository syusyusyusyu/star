import React from 'react';

interface SlotProps {
  id: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export const Slot: React.FC<SlotProps> = ({ id, position }) => {
  const getStyle = (pos: 'top' | 'bottom' | 'left' | 'right'): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      width: '300px',
      height: '300px',
      border: '1px solid rgba(57, 197, 187, 0.2)',
      borderRadius: '50%',
      overflow: 'hidden',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.5)',
      zIndex: 20, // Ensure it's above background but maybe below some UI?
      pointerEvents: 'none', // Container shouldn't block clicks, but children (bubbles) should
    };

    // Adjust positions based on the screenshot/requirements
    switch (pos) {
      case 'top': 
        return { ...baseStyle, top: '5%', left: '50%', transform: 'translateX(-50%)' };
      case 'bottom': 
        // Bottom slot needs to be visible above the "grass" or bottom UI if any
        return { ...baseStyle, bottom: '15%', left: '50%', transform: 'translateX(-50%)' };
      case 'left': 
        return { ...baseStyle, top: '50%', left: '5%', transform: 'translateY(-50%)' };
      case 'right': 
        return { ...baseStyle, top: '50%', right: '5%', transform: 'translateY(-50%)' };
    }
  };

  return (
    <div id={id} className="game-slot" style={getStyle(position)}>
      {/* Bubbles will be appended here by GameManager */}
    </div>
  );
};
