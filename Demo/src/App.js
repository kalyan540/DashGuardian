import React from 'react';
import DashboardViewer from './EmbedDashboard';

const userDetails = {
  username: 'john_doe',
  first_name: 'John',
  last_name: 'Doe',
};

const accountRoleInfo = {
  account: 'IT',
  role: 'Admin',
};

function App() {
  return (
    <DashboardViewer
      dashboardId={process.env.REACT_APP_DASHBOARD_ID_1}
      userDetails={userDetails}
      accountRoleInfo={accountRoleInfo}
    />
  );
}

export default App;