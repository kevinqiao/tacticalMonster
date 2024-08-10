import React from "react";
import Popup from "../../common/Popup";

const PatternMain: React.FC = () => {
  return (
    <div>
      <Popup
        render={(togglePopup) => (
          <div>
            <h2>Popup Content</h2>
            <button onClick={togglePopup}>Dismiss</button>
          </div>
        )}
      />
    </div>
  );
};

export default PatternMain;
