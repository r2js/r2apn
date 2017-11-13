const apn = require('apn');
const sinon = require('sinon');
const r2base = require('r2base');
const r2apn = require('../index');
const chai = require('chai');

const { expect } = chai;
process.chdir(__dirname);

const app = r2base();
app.start().serve(r2apn, {}).into(app);
const Apn = app.service('Apn');

const data = {
  message: 'test title',
  topic: 'com.test.app',
  badge: 2,
  sound: 'mySound.aiff',
  payload: {
    action: 'test-action',
    email: 'test@app.com',
  },
  tokens: [
    '43e798c31a282d129a34d84472bbdd7632562ff0732b58a85a27c5d9fdf59b61',
    '43e798c31a282d129a34d84472bbdd7632562ff0732b58a85a27c5d9fdf59b62',
    '43e798c31a282d129a34d84472bbdd7632562ff0732b58a85a27c5d9fdf59b63',
    '43e798c31a282d129a34d84472bbdd7632562ff0732b58a85a27c5d9fdf59b64',
    '43e798c31a282d129a34d84472bbdd7632562ff0732b58a85a27c5d9fdf59b65',
    '43e798c31a282d129a34d84472bbdd7632562ff0732b58a85a27c5d9fdf59b66',
  ],
};

let sendMethod;
const fErr = new Error('Forced error');

const sendOkMethod = () => (
  sinon.stub(apn.Provider.prototype, 'send').callsFake((message, _regIds) => {
    expect(_regIds).to.be.instanceOf(Array);
    _regIds.forEach(regId => expect(data.tokens).to.include(regId));
    expect(message).to.be.instanceOf(apn.Notification);
    expect(message.payload).to.deep.equal({ action: 'test-action', email: 'test@app.com' });
    expect(message.aps).to.deep.equal({ alert: 'test title', badge: 2, sound: 'mySound.aiff' });
    expect(message.priority).to.equal(10);
    expect(message.topic).to.equal('com.test.app');
    return Promise.resolve({
      sent: _regIds,
    });
  })
);

const sendFailureMethod1 = () => (
  sinon.stub(apn.Provider.prototype, 'send').callsFake((message, _regIds) => Promise.resolve({
    failed: _regIds.map(regId => ({
      device: regId,
      response: fErr.message,
    })),
  }))
);

const sendFailureMethod2 = () => (
  sinon.stub(apn.Provider.prototype, 'send').callsFake((message, _regIds) => Promise.resolve({
    failed: _regIds.map(regId => ({
      device: regId,
      response: {
        reason: fErr.message,
      },
    })),
  }))
);

describe('r2apn', () => {
  describe('succesful response', () => {
    before(() => {
      sendMethod = sendOkMethod();
    });

    after(() => {
      sendMethod.restore();
    });

    it('should send push notifications, succesful', (done) => {
      Apn.send(data)
        .then((results) => {
          expect(results.method).to.equal('apn');
          expect(results.device).to.equal('ios');
          expect(results.success).to.equal(6);
          expect(results.failure).to.equal(0);
          expect(results.message.length).to.equal(data.tokens.length);
          done();
        })
        .catch(done);
    });
  });

  describe('failure response', () => {
    before(() => {
      sendMethod = sendFailureMethod1();
    });

    after(() => {
      sendMethod.restore();
    });

    it('should send push notifications, failure (response message)', (done) => {
      Apn.send(data)
        .then((results) => {
          expect(results.method).to.equal('apn');
          expect(results.device).to.equal('ios');
          expect(results.success).to.equal(0);
          expect(results.failure).to.equal(6);
          expect(results.message.length).to.equal(data.tokens.length);
          expect(results.message[0].token).to.equal(data.tokens[0]);
          expect(results.message[0].error).to.equal('Forced error');
          expect(results.message[1].token).to.equal(data.tokens[1]);
          expect(results.message[1].error).to.equal('Forced error');
          done();
        })
        .catch(done);
    });
  });

  describe('failure response', () => {
    before(() => {
      sendMethod = sendFailureMethod2();
    });

    after(() => {
      sendMethod.restore();
    });

    it('should send push notifications, failure (response reason)', (done) => {
      Apn.send(data)
        .then((results) => {
          expect(results.method).to.equal('apn');
          expect(results.device).to.equal('ios');
          expect(results.success).to.equal(0);
          expect(results.failure).to.equal(6);
          expect(results.message.length).to.equal(data.tokens.length);
          expect(results.message[0].token).to.equal(data.tokens[0]);
          expect(results.message[0].error).to.equal('Forced error');
          expect(results.message[1].token).to.equal(data.tokens[1]);
          expect(results.message[1].error).to.equal('Forced error');
          done();
        })
        .catch(done);
    });
  });
});
