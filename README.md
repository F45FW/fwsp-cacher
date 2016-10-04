# Cacher
A simple module for caching using Redis.

## Introduction

Cacher is a wrapper module to abstract cache details and handling in order to make it easier for clients to simply get and set cached data.

Cacher has five public functions: `init`, `setCachePrefix`, `getData`, `setData` and `setTTL`.  The most common methods you'll use after `init` will be the `getData` and `setData` methods.

####init

Used to initialize a cacher object with an object containing the address, port and database number for use with Redis.

```javascript
let cacher = new Cacher();
cacher.init({
  url: '127.0.0.1',
  port: 6379,
  db: 1  
});
```

#### setCachePrefix

By default Cacher prefix keys in Redis with the word `cacher`. To specify an alternative prefix use the setCachePrefix member.

```javascript
cacher.setCachePrefix('myAppName');
```

#### getData

```javascript
/**
 * @name getData
 * @summary Retrieve data from cache using key.
 * @param {string} key - lookup key
 * @return {object} promise - promise resolving to value of key or rejection
 */
 getData(key)
```

#### setData

```javascript
/**
 * @name setData
 * @summary Place data in cache based on key for a duration of cacheDurationInSeconds.
 * @param {string} key - lookup key
 * @param {object} data - data to store at key
 * @param {number} cacheDurationInSeconds - cache expiration
 * @return {object} promise - resolving to success or rejection
 */
 setData(key, data, cacheDurationInSeconds)
```

#### setTTL

```javascript
/**
 * @name setTTL
 * @summary Set Time To Live for cache entry associated with key.
 * @param {string} key - key to set
 * @param {number} cacheDurationInSeconds - seconds to reset expiration to
 * @return {object} promise - resolving to success or rejection
 */
 setTTL(key, cacheDurationInSeconds)
```

## Tests

This module contains tests in the `specs` folder.

To run them make sure you have mocha installed:

```shell
$ npm install mocha -g
```

Then run:

```shell
$ npm run test
```
