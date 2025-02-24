import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';

export const useCurrentDateTime = () => {
  const [currentDateTime, setCurrentDateTime] = useState(DateTime.now());

  useEffect(() => {
    // Update immediately and then every minute
    const updateDateTime = () => {
      setCurrentDateTime(DateTime.now());
    };

    // Set up interval to update every minute
    const interval = setInterval(updateDateTime, 60000); // 60000ms = 1 minute

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  return currentDateTime;
};
