'use strict';

const Promise = require('bluebird');
const redis = require('redis');
const utils = require('@flywheelsports/jsutils');

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
    this.cachePrefix = 'cacher';
  }

  /**
   * @name setCachePrefix
   * @description Set the cache key prefix. The default is cacher.
   * @param {string} name - text which will prefix cache key name
   */
  setCachePrefix(name) {
    this.cachePrefix = name;
  }

  /**
   * @name getData
   * @summary Retrieve data from cache using key.
   * @param {string} key - lookup key
   * @return {object} promise - promise resolving to value of key or rejection
   */
  getData(key) {
    const hKeyLabel = `${this.cachePrefix}:${key}`;
    let db = null;
    return new Promise((resolve, reject) => {
      this.openDB()
        .then((dbObj) => {
          db = dbObj;
          db.get(hKeyLabel, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(utils.safeJSONParse(result));
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
    const hKeyLabel = `${this.cachePrefix}:${key}`;

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
   * @name setTTL
   * @summary Set Time To Live for cache entry associated with key.
   * @param {string} key - key to set
   * @param {number} cacheDurationInSeconds - seconds to reset expiration to
   * @return {object} promise - resolving to success or rejection
   */
  setTTL(key, cacheDurationInSeconds) {
    const hKeyLabel = `${this.cachePrefix}:${key}`;

    return new Promise((resolve, reject) => {
      let db = null;
      this.openDB()
        .then((dbObj) => {
          db = dbObj;
          db.get(hKeyLabel, (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(utils.safeJSONParse(result));
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
   * @name deleteData
   * @summary Deletes cache entry associated with key
   * @param {string} key - key to delete
   * @return {object} promise - resolving to success or rejection
   */
  deleteData(key) {
    const hKeyLabel = `${this.cachePrefix}:${key}`;

    return new Promise((resolve, reject) => {
      this.openDB()
        .then(db => {
          db.del(hKeyLabel, error => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
    });
  }

  /**
   * @name getDataWithFallback
   * @summary Tries to fetch data from cache first, if not present, calls fallback function and caches it's result if it resolves.
   * resolves with either cache result or result from fallback function
   * @param {string} key - key to delete
   * @param {number} cacheDurationInSeconds - cache expiration
   * @param {function} fallback - fallback function that must return a promise
   * @return {object} promise - resolving to success or rejection
   */
  getDataWithFallback(key, cacheDurationInSeconds, fallback) {
    return new Promise((resolve, reject) => {
      this.getData(key)
        .then(res => {
          if (res != null) {
            return res;
          }
          return fallback()
            .then(res => {
              return this.setData(key, res, cacheDurationInSeconds)
                .then(() => {
                  return res;
                });
            });
        })
        .then(resolve)
        .catch(reject);
    });
  }
}

module.exports = Cacher;
