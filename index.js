const { URL } = require('url'),
      urlFormat = require('url').format,
      _ = require('lodash')
var co = require('co');
var throat = require('throat');
var request = require('request-promise-native');
var cheerio = require('cheerio');

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
    .map((i, e) => new URL($(e).attr('href'), base))
    .get()  // $().map() is weird in this way
}

/* Another coroutine function */
function* scrape_step (opts) {
  let { start, parsed, scrape_moar } = opts
  let $ = yield co(url2cheerio, start)
  parsed(start, $)
  for (let url of all_urls($, start)) {
    scrape_moar(url)
  }
}

function scrape (start, keep_cb) {
  visited = {}
  visited[start] = true

  co(scrape_step, {
    start: start,
    parsed(url, $) {
      console.log('Parsed ' + url)
    },
    scrape_moar(url) {
      if (! keep_cb(url)) return
      url_txt = urlFormat(url, {fragment: false})
      if (visited[url_txt]) return
      visited[url_txt] = true
      console.log('Now we could visit ' + url_txt)
    }
  })
  .catch(function(e) { console.log("ERROR", e) })
}

scrape("https://sti-test.epfl.ch/", 
       (url) => url.origin === "https://sti-test.epfl.ch")
