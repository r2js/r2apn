const apn = require('apn');
const dot = require('dotty');
const log = require('debug')('r2:apn');

module.exports = function Apn(app, conf) {
  const getConf = conf || app.config('apn');
  if (!getConf) {
    return log('apn config not found!');
  }

  const env = app.get('env');
  const device = 'ios';
  const method = 'apn';

  const {
    cert = `${process.cwd()}/data/${env}/cert.pem`,
    key = `${process.cwd()}/data/${env}/key.pem`,
    production = (env === 'production'),
  } = getConf;

  const connection = () => new apn.Provider({ cert, key, production });

  const sendNotification = conn => (opts) => {
    const {
      message: alert,
      payload = {},
      badge = 1,
      sound = 'default',
      topic = null,
      tokens = [],
    } = opts;

    const note = new apn.Notification();
    Object.assign(note, { alert, payload, badge, sound, topic });
    log('sending notification %o', note);

    return conn.send(note, tokens)
      .then((data = {}) => {
        const { sent = [], failed = [] } = data;
        const response = { method, device, success: 0, failure: 0, message: [] };

        sent.reduce((prev, token) => {
          prev.success += 1; // eslint-disable-line
          prev.message.push({ token, error: null });
          return prev;
        }, response);

        failed.reduce((prev, failure) => {
          const { device: token, error, response: failureResp } = failure;
          const errorResp = error || dot.get(failure, 'response.reason') || failureResp;

          prev.failure += 1; // eslint-disable-line
          prev.message.push({ token, error: errorResp });
          return prev;
        }, response);

        return response;
      });
  };

  const send = sendNotification(connection());

  return { device, method, send };
};