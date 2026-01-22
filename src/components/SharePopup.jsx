import React from 'react';
import PropTypes from 'prop-types';

/**
 * SharePopup - Displays a share button when text is selected
 * @param {string} text - The selected text to share
 * @param {object} position - Position object with x and y coordinates
 * @param {function} onShare - Callback function when share button is clicked
 */
const SharePopup = ({ text, position, onShare }) => {
  if (!text) return null;

  // Prevent button click from deselecting text
  const handleMouseDown = (e) => {
    e.preventDefault();
  };

  return (
    <div
      className="absolute z-10"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -120%)' }}
      onMouseDown={handleMouseDown}
    >
      <button
        onClick={onShare}
        className="bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg font-semibold text-sm hover:bg-slate-700 transition-colors"
      >
        Partilhar
      </button>
    </div>
  );
};

SharePopup.propTypes = {
  text: PropTypes.string,
  position: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
  }).isRequired,
  onShare: PropTypes.func.isRequired,
};

SharePopup.defaultProps = {
  text: '',
};

export default SharePopup;
