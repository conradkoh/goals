import React from 'react';

const NavigationHeader = () => {
  return (
    <header className="bg-gray-100 p-4 flex items-center justify-between shadow">
      <div className="flex items-center space-x-4">
        <div className="text-xl font-bold">Goals Dashboard</div>
        <div className="flex space-x-2">
          <button className="px-3 py-1 border rounded">Quarter</button>
          <button className="px-3 py-1 border rounded">Week</button>
          <button className="px-3 py-1 border rounded">Day</button>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <input
          type="text"
          placeholder="Search..."
          className="p-2 border rounded"
        />
        <button className="p-2">🔔</button>
        <button className="p-2 rounded-full border">U</button>
      </div>
    </header>
  );
};

export default NavigationHeader;
