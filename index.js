'use strict';

const Promise = require('bluebird');
const redis = require('redis');
const crypto = require('crypto');

/**
 * @name cacher
 * @description application cache module which uses Redis
 * @author Carlos Justiniano
 */
class CacheDB {
  /**
  * @name init
  * @summary Cacher initialization. Requires a configuration object with the following fields:
  * {
  *   url: '127.0.0.1',
  *   port: 6379,
  *   db: 1
  * }
  * @param {object} config - configuration object
  */
  init(config) {
    this.config = Object.assign({
      db: 1
    }, config);
  }

  /**
  * @name openDB
  * @summary Opens a redis connection and selects a database
  * @return {object} promise - resolving or rejecting if error
  */
  openDB() {
    let db = redis.createClient(
      this.config.port,
      this.config.url,
      null);
    return new Promise((resolve, reject) => {
      db.select(this.config.db, (err, reply) => {
        (err) ? reject(err) : resolve(db);
      });
    });
  }

  /**
  * @name closeDB
  * @summary Closes a redis connection
  * @param {object} db - redis client objet
  */
  closeDB(db) {
    db.end(0);
  }

  /**
  * @name setExpire
  * @summary Sets the expiration of a redis key
  * @param {object} db - redis client db
  * @param {string} hKeyLabel - key label
  * @param {number} cacheDurationInSeconds - the total number of seconds before expring the key
  * @param {function} resolve - promise resovle handler
  * @param {function} reject - promise rejection handler
  */
  setExpire(db, hKeyLabel, cacheDurationInSeconds, resolve, reject) {
    db.expire(hKeyLabel, cacheDurationInSeconds, (error, result) => {
      (!error) ? resolve(result) : reject(error);
      this.closeDB(db);
    });
  }

  /**
  * @name hash
  * @summary Hashes a key to produce an MD5 hash
  * @param {string} key - input key to hash
  * @return {string} hash - hashed value
  */
  hash(key) {
    return crypto
      .createHash('md5')
      .update(key)
      .digest('hex');
  }
}

/**
* @name Cacher
* @description Cacher class
*/
class Cacher extends CacheDB {
  constructor() {
    super();
  }

  /**
  * @name init
  * @summary Cacher initialization. Requires a configuration object with the following fields:
  * {
  *   url: '127.0.0.1',
  *   port: 6379,
  *   db: 1
  * }
  * @param {object} config - configuration object
  */
  init(config) {
    super.init(config);
  }

  /**
   * @name getData
   * @summary Retrieve data from cache using key.
   * @param {string} key - lookup key
   * @return {object} promise - promise resolving to value of key or rejection
   */
  getData(key) {
    const hKeyLabel = `appcache:${this.hash(key)}`;
    let db = null;
    return new Promise((resolve, reject) => {
      this.openDB()
        .then((dbObj) => {
          db = dbObj;
          db.get(hKeyLabel, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(JSON.parse(result));
            }
            this.closeDB(db);
          });
        })
        .catch((reason) => {
          reject(reason);
          this.closeDB(db);
        });
    });
  }

  /**
   * @name setData
   * @summary Place data in cache based on key for a duration of cacheDurationInSeconds.
   * @param {string} key - lookup key
   * @param {object} data - data to store at key
   * @param {number} cacheDurationInSeconds - cache expiration
   * @return {object} promise - resolving to success or rejection
   */
  setData(key, data, cacheDurationInSeconds) {
    const hKeyLabel = `appcache:${this.hash(key)}`;

    // Added because Node 4.2.1 does not support ES6 default function parameters - CJ
    cacheDurationInSeconds = (typeof cacheDurationInSeconds !== 'undefined') ? cacheDurationInSeconds : 0;

    return new Promise((resolve, reject) => {
      let db = null;
      this.openDB()
        .then((dbObj) => {
          db = dbObj;
          db.setex(hKeyLabel, cacheDurationInSeconds, JSON.stringify(data), (error, result) => {
            (error) ? reject(error) : resolve();
            this.closeDB(db);
          });
        })
        .catch((reason) => {
          reject(reason);
          this.closeDB(db);
        });
    });
  }

  /**
   * @name RefreshTTL
   * @summary Refresh Time To Live for cache entry associated with key.
   * @param {string} key - key to refresh
   * @param {number} cacheDurationInSeconds - seconds to reset expiration to
   * @return {object} promise - resolving to success or rejection
   */
  refreshTTL(key, cacheDurationInSeconds) {
    const hKeyLabel = `appcache:${this.hash(key)}`;

    return new Promise((resolve, reject) => {
      let db = null;
      this.openDB()
        .then((dbObj) => {
          db = dbObj;
          db.get(hKeyLabel, (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(JSON.parse(result));
              this.setExpire(db, hKeyLabel, cacheDurationInSeconds, resolve, reject);
            } else {
              reject();
              this.closeDB(db);
            }
          });
        });
    });
  }

  /**
   * @name GetDataWithFetchCallback
   * @description Returns a promise that resolves with data when cached, otherwise calls "fetchCallback"
   *      to get a new promise, then caches the result from that promise and resolves with that result.
   * @param {string} key - lookup key
   * @param {number} cacheDurationInSeconds - cache expiration
   * @param {function} fetchCallback - function that will return a promise that resolves with the data that should be cached.
   * @return {object} promise - promise resolving to value of key or rejection
   */
  getDataWithFetchCallback(key, cacheDurationInSeconds, fetchCallback) {
    return new Promise((resolve, reject) => {
      // Try to get data from cache
      this.getData(key)
        .then((cacheData) => {
          // The data is cached, just resolve with it
          resolve(cacheData);
        })
        .catch((err) => {
          if (err !== null) {
            // There was an actual error, so we reject
            return reject(err);
          }
          // No error, but data was not cached, so we call the fetchCallback, which has to return a promise
          fetchCallback()
            .then((res) => {
              // fetchCallback resolved with data, so we cache it
              this.setData(key, res, cacheDurationInSeconds)
                .then(() => {
                  // Then resolve with that response
                  resolve(res);
                })
                .catch((err) => {
                  // We failed to cache it, so we reject with an error
                  reject(err);
                });
            })
            .catch((err) => {
              // fetchCallback rejected, so we reject this whole method
              reject(err);
            });
        });
    });
  }

}

module.exports = Cacher;
