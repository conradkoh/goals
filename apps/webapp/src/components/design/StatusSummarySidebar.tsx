import React from 'react';

const StatusSummarySidebar = () => {
  return (
    <aside className="p-4 border rounded shadow bg-white space-y-4">
      <div>
        <h3 className="text-lg font-bold mb-2">Quarter Overview</h3>
        <p className="text-sm">Overall Progress: 65%</p>
      </div>
      <div>
        <h4 className="font-semibold">Team Availability</h4>
        <p className="text-sm">4 of 5 available</p>
      </div>
      <div>
        <h4 className="font-semibold">Key Metrics</h4>
        <p className="text-sm">Tasks Completed: 20</p>
        <p className="text-sm">Pending Tasks: 5</p>
      </div>
    </aside>
  );
};

export default StatusSummarySidebar;
