import { Switchboard } from './Switchboard';
import jwtDecode from 'jwt-decode';

const IFRAME_COMMS_MESSAGE_TYPE = '__embedded_comms__';
const DASHBOARD_UI_FILTER_CONFIG_URL_PARAM_KEY = {
  visible: 'show_filters',
  expanded: 'expand_filters',
};

export async function embedDashboard({
  id,
  DashboardDomain,
  mountPoint,
  fetchGuestToken,
  dashboardUiConfig,
  debug = false,
}) {
  function log(...info) {
    if (debug) console.debug(`[iframe][dashboard ${id}]`, ...info);
  }

  log('embedding');

  function calculateConfig() {
    let configNumber = 0;
    if (dashboardUiConfig) {
      if (dashboardUiConfig.hideTitle) configNumber += 1;
      if (dashboardUiConfig.hideTab) configNumber += 2;
      if (dashboardUiConfig.hideChartControls) configNumber += 8;
    }
    return configNumber;
  }

  async function mountIframe() {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      const dashboardConfig = dashboardUiConfig ? `?uiConfig=${calculateConfig()}` : '';
      const filterConfig = dashboardUiConfig?.filters || {};
      const filterConfigKeys = Object.keys(filterConfig);
      const filterConfigUrlParams = filterConfigKeys.length > 0
        ? '&' + filterConfigKeys.map((key) => DASHBOARD_UI_FILTER_CONFIG_URL_PARAM_KEY[key] + '=' + filterConfig[key]).join('&')
        : '';

      iframe.sandbox.add('allow-same-origin');
      iframe.sandbox.add('allow-scripts');
      iframe.sandbox.add('allow-presentation');
      iframe.sandbox.add('allow-downloads');
      iframe.sandbox.add('allow-forms');
      iframe.sandbox.add('allow-popups');

      iframe.addEventListener('load', () => {
        const commsChannel = new MessageChannel();
        const ourPort = commsChannel.port1;
        const theirPort = commsChannel.port2;
        iframe.contentWindow.postMessage(
          { type: IFRAME_COMMS_MESSAGE_TYPE, handshake: 'port transfer' },
          DashboardDomain,
          [theirPort]
        );
        log('sent message channel to the iframe');
        resolve(new Switchboard({ port: ourPort, name: 'iframe', debug }));
      });

      iframe.src = `${DashboardDomain}/embedded/${id}${dashboardConfig}${filterConfigUrlParams}`;
      mountPoint.replaceChildren(iframe);
      log('placed the iframe');
    });
  }

  const [guestToken, ourPort] = await Promise.all([fetchGuestToken(), mountIframe()]);
  ourPort.emit('guestToken', { guestToken });
  log('sent guest token');

  async function refreshGuestToken() {
    const newGuestToken = await fetchGuestToken();
    ourPort.emit('guestToken', { guestToken: newGuestToken });
    setTimeout(refreshGuestToken, getGuestTokenRefreshTiming(newGuestToken));
  }

  function getGuestTokenRefreshTiming(token) {
    const parsedJwt = jwtDecode(token);//(0, jwtDecode.default)(token);
    const exp = new Date(/[^0-9.]/g.test(parsedJwt.exp) ? parsedJwt.exp : parseFloat(parsedJwt.exp) * 1000);
    const isValidDate = exp.toString() !== 'Invalid Date';
    const ttl = isValidDate ? Math.max(10000, exp.getTime() - Date.now()) : 300000;
    return ttl - 5000;
  }

  setTimeout(refreshGuestToken, getGuestTokenRefreshTiming(guestToken));

  function unmount() {
    log('unmounting');
    mountPoint.replaceChildren();
  }

  const getScrollSize = () => ourPort.get('getScrollSize');
  const getDashboardPermalink = (anchor) => ourPort.get('getDashboardPermalink', { anchor });
  const getActiveTabs = () => ourPort.get('getActiveTabs');

  return {
    getScrollSize,
    unmount,
    getDashboardPermalink,
    getActiveTabs,
  };
}