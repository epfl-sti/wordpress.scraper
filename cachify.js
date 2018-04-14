/**
 * Cachify any `request`-like function (that takes a single string-ish arg and
 * returns a Promise)
 *
 * The cache is persistent. The returned function has a .clear_cache() function
 * attached.
 */
let Cache = require('async-disk-cache')

function cachify (req) {
  let cache = new Cache('epflsti-scraper')
  console.log(cache.pathFor("https://sti.epfl.ch/"))
  cachified = function(key) {
    return cache.get(key).then(function(in_cache) {
      if (in_cache.isCached) return in_cache.value
      let response
      return req(key).then(function(resp) {
        response = resp
        return cache.set(key, resp)
      }).then(() => response)
    })
  }
  cachified.clear_cache = () => cache.clear()
  return cachified
}

module.exports = cachify
