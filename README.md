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

#### setData

#### setTTL


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
