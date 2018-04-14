/**
 * Cachify any `request`-like function (that takes a single string-ish arg and
 * returns a Promise of a string)
 *
 * The cache is persistent. The returned function has a .clear_cache() function
 * attached.
 *
 * cachify.with40x() provides ad-hoc caching of request's 40x errors.
 */
let Cache = require('async-disk-cache'),
    debug = require('debug')('cachify'),
    EventEmitter = require('events').EventEmitter,
    throat = require("throat")

function cachify (req, opts) {
  let cache = new Cache('epflsti-scraper', {location: "/tmp/epflsti-scraper"}),
      events = new EventEmitter()

  if (! opts) opts = {}

  // Throttle insane filesystem parallelism:
  cache.get = throat(100, cache.get)

  cachified = function(key) {
    return cache.get(key).then(function(in_cache) {
      if (in_cache.isCached) {
        if (in_cache.value) {
          events.emit("cache-hit", key)
          return in_cache.value
        } else {
          return cache.get('ERROR-' + key).then(function(error_in_cache) {
            if (! error_in_cache.isCached) {
              debug("No error - The cached value was indeed the empty string at " + key)
              return ''
            }
            let serialized = error_in_cache.value,
                e = new Error('Cached and forgotten error')
            if (opts.errorDecache) {
              let restoredError = opts.errorDecache(serialized)
              if (restoredError instanceof Error) {
                e = restoredError
                events.emit("cache-hit-with-error", key, e)
              }
            }
            return Promise.reject(e)
          })
        }
      }
      events.emit("cache-miss", key)
      let response
      return req(key).catch((e) => {
        debug("Error at " + key + ": " + e)
        let whatDo = Promise.resolve()
        if (opts.errorEncache) {
          serialized = opts.errorEncache(e)
          if (serialized) {
            events.emit("cache-write-with-error", key, e)
            whatDo = cache.set(key, '').then(() => cache.set('ERROR-' + key, serialized))
          }
        }
        return whatDo.then(() => Promise.reject(e))
      }).then(function(resp) {
        response = resp
        events.emit("cache-write", key, response)
        return cache.set(key, response)
      }).then(() => response)
    })
  }
  cachified.clear_cache = () => cache.clear()
  cachified.on = events.on.bind(events)
  cachified.once = events.once.bind(events)
  return cachified
}

module.exports = cachify

cachify.with40x = function(req) {
  if (! req) {
    req = throat(10, require('request-promise-native'))
  }
  return cachify(req, {
    errorEncache(e) {
      if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500) {
        return e.statusCode
      }
    },
    errorDecache(statusCode) {
      e = new Error('Cached error')
      e.statusCode = Number(statusCode)   // Good enough for how index.js manages errors
      return e
    }
  })
}
