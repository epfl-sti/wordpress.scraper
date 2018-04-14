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
function all_urls_and_elts ($, state) {
  return $('a')
    .map(function (i, e) {
      const rel_url = $(e).attr('href')
      if (! rel_url) return null
      try {
        return {
          url: new URL.URL(rel_url, state.base),
          elt: e
        }
      } catch (error) {
        console.log("Unparsable URL: " + rel_url + " in " + state.referer)
        return null
      }
    })
    .get()  // $().map() is weird in this way
}

module.exports = function scrape (opts) {
  // scrape_at below should *not* close over opts - The pieces of opts that it needs
  // are extracted below:
  let { request, keep_p, parsed, link, error } = opts
  if (! request) { request = require('request-promise-native') }
  var visited = {},
      links = {}
  visited[opts.start] = true

  function scrape_at (referer) {
    return co(url2cheerio, referer, request)
      .then(function($) {
        parsed(referer, $)
        let subscrapes = []
        let state = { base: referer, referer: referer }
        for (let {url, elt} of all_urls_and_elts($, state)) {
          let to_url = url
          if (! keep_p(to_url)) continue
          const to_url_txt = URL.format(to_url, {fragment: false})
          if (link) {
            const link_key = referer + '→' + to_url_txt
            if (! links[link_key]) {
              link(referer, $, elt, to_url_txt)
              links[link_key] = true
            }
          }
          if (visited[to_url_txt]) continue
          visited[to_url_txt] = true
          subscrapes.push(scrape_at(to_url_txt))
        }
        return Promise.all(subscrapes)
      })
      .catch(function(e) {
        if (error) {
          error(referer, e)
        } else {
          console.log("ERROR", e)
        }
      })
  }

  return scrape_at(opts.start)
}
