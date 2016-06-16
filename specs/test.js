'use strict';

require('./helpers/chai.js');
const Cacher = require('../index.js') ;
const config = require('./properties').value;

describe('Cacher', () => {
  it('should cache an object', (done) => {
    let cacher = new Cacher();
    cacher.init(config.redis);
    cacher.setData('test1', {a: 12}, 15)
      .then((result) => {
        expect(result).to.be.undefined;
        return cacher.getData('test1')
          .then((result) => {
            expect(result).to.have.property('a');
            expect(result.a).to.be.equal(12);
            done();
          })
          .catch((err) => {
            expect(err).to.be.null;
            done();
          });
      })
      .catch((err) => {
        expect(err).to.be.null;
      });
  });

  it('should create an entry that properly expires', (done) => {
    let cacher = new Cacher();
    let delay = 3; //seconds
    cacher.init(config.redis);
    cacher.setData('test2', {a: 12}, delay);
    setTimeout(() => {
      cacher.getData('test2')
        .then((result) => {
          expect(result).to.be.null;
          done();
        });
    }, (delay * 1000) + 1000);
  }).timeout(5000);

  it('should be able to expire a cached entry using set a TTL', (done) => {
    let cacher = new Cacher();
    cacher.init(config.redis);
    cacher.setData('test3', {a: 12}, 15)
      .then(() => {
        cacher.setTTL('test3', 0)
          .then(() => {
            cacher.getData('test3')
              .then((result) => {
                expect(result).to.be.null;
                done();
              });
          });
      });
  });
});
