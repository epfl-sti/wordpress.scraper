/**
 * Cachify any `request`-like function (that takes a single string-ish arg and
 * returns a Promise)
 *
 * The cache is persistent. The returned function has a .clear_cache() function
 * attached.
 */
let Cache = require('async-disk-cache'),
    EventEmitter = require('events').EventEmitter,
    throat = require("throat")

function cachify (req) {
  let cache = new Cache('epflsti-scraper', {location: "/tmp/epflsti-scraper"}),
      events = new EventEmitter()

  // Throttle insane filesystem parallelism:
  cache.get = throat(100, cache.get)

  cachified = function(key) {
    return cache.get(key).then(function(in_cache) {
      if (in_cache.isCached) {
        events.emit("cache-hit", key)
        if (in_cache.value instanceof Error) {
          throw in_cache.value
        } else {
          return in_cache.value
        }
      }
      events.emit("cache-miss", key)
      let response
      return req(key).then(function(resp) {
        response = resp
        events.emit("cache-write", key)
        return cache.set(key, resp)
      }).then(() => response)
      .catch((e) => {
        if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500) {
          cache.set(key, e)
        }
        throw e
      })
    })
  }
  cachified.clear_cache = () => cache.clear()
  cachified.on = events.on.bind(events)
  cachified.once = events.once.bind(events)
  return cachified
}

module.exports = cachify
