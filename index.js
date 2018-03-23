'use strict'

const URL = require('url'),
      _ = require('lodash'),
      co = require('co'),
      throat = require('throat'),
      request = require('request-promise-native'),
      cheerio = require('cheerio')

/* A coroutine function: yields promises, expects
 * that the framework (co) "yields back" the results
 * of said promises.
 */
function* url2cheerio (url) {
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

function scrape (opts) {
  const { start, keep_p, parsed, link, error } = opts
  var visited = {},
      links = {}
  visited[start] = true

  function scrape_at (from_url) {
    co(url2cheerio, start)
      .then(function($) {
        parsed(from_url, $)
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
          scrape_at(to_url_txt)
        }
      })
      .catch(function(e) {
        if (error) {
          error(from_url, e)
        } else {
          console.log("ERROR", e)
        }
      })
  }

  scrape_at(start)
}

scrape({
  start: "https://sti-test.epfl.ch/", 
  keep_p: (url_obj) => url_obj.origin === "https://sti-test.epfl.ch",
  parsed(url, $) {
    console.log('Parsed ' + url)
  },
  link(from, to) {
    if (to.startsWith('https://sti-test.epfl.ch')) {
      console.log('Link from ' + from + ' to ' + to)
    }
  },
  error(url, e) {
    if (e.statusCode) {
      console.log(e.statusCode + ' at ' + url)
    } else {
      console.log(e + ' at ' + url)
      throw e
    }
  }
})

