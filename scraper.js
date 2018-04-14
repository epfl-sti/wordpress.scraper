/**
 * A simple, recursive scraper
 */

'use strict'

const URL = require('url'),
      _ = require('lodash'),
      co = require('co'),
      cheerio = require('cheerio')

/* A coroutine function: yields promises, expects
 * that the framework (co) "yields back" the results
 * of said promises.
 */
function* url2cheerio (url, request) {
  let html = yield request(url)
  return cheerio.load(html)
}

/* An ordinary function, which does all it has to
 * do in a single game turn.
 */
function all_urls ($, base) {
  return $('a')
    .map(function (i, e) {
      const rel_url = $(e).attr('href')
      return rel_url ? new URL.URL(rel_url, base) : null
    })
    .get()  // $().map() is weird in this way
}

module.exports = function scrape (opts) {
  let { request, start, keep_p, parsed, link, error } = opts
  if (! request) { request = require('request-promise-native') }
  var visited = {},
      links = {}
  visited[start] = true

  function scrape_at (from_url) {
    return co(url2cheerio, start, request)
      .then(function($) {
        parsed(from_url, $)
        let subscrapes = []
        for (let to_url of all_urls($, start)) {
          const to_url_txt = URL.format(to_url, {fragment: false})
          if (link) {
            const link_key = from_url + '→' + to_url_txt
            if (! links[link_key]) {
              link(from_url, to_url_txt)
              links[link_key] = true
            }
          }
          if (! keep_p(to_url)) continue
          if (visited[to_url_txt]) continue
          visited[to_url_txt] = true
          subscrapes.push(scrape_at(to_url_txt))
        }
        return Promise.all(subscrapes)
      })
      .catch(function(e) {
        if (error) {
          error(from_url, e)
        } else {
          console.log("ERROR", e)
        }
      })
  }

  return scrape_at(start)
}
