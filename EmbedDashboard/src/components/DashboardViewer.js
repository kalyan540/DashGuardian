import { useEffect } from 'react';
import { embedDashboard } from '../utils/embedDashboard';

function DashboardViewer({ dashboardId, userDetails, accountRoleInfo }) {
  const { username, first_name, last_name } = userDetails;
  const { account, role } = accountRoleInfo;

  const getToken = async () => {
    const response = await fetch(process.env.REACT_APP_BACKEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dashboardId, // Include dashboardId in the request body
        userDetails: { username, first_name, last_name },
        accountRoleInfo: { account, role },
      }),
    });
    const data = await response.json();
    const token = data.token;
    console.log('Received guest token:', token);
    return token;
  };

  useEffect(() => {
    const embed = async () => {
      await embedDashboard({
        id: dashboardId,
        DashboardDomain: process.env.REACT_APP_DASHBOARD_DOMAIN,
        mountPoint: document.getElementById('dashboard'),
        fetchGuestToken: () => getToken(),
        dashboardUiConfig: {
          hideTitle: true,
          hideChartControls: true,
          hideTab: true,
          filters: {
            expanded: false,
          },
        },
      });
    };

    if (document.getElementById('dashboard')) {
      embed();
    }
  }, [dashboardId, userDetails, accountRoleInfo]);

  return (
      <div id="dashboard"></div>
  );
}

export default DashboardViewer;