const { URL } = require('url'),
      urlFormat = require('url').format
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

/* Another coroutine function (unfinished)
 */
function* scrape (opts) {
  let { start, limit } = opts
  let $ = yield co(url2cheerio, start)
  return all_urls($, start)
    .filter(url => url.origin === limit)
    .map(u => urlFormat(u, {fragment: false}))
}

co(scrape, { start: "https://sti-test.epfl.ch/",
             limit: "https://sti-test.epfl.ch"})
  .then(function(urls) {
    console.log(urls)
  })
  .catch(function(e) { console.log("ERROR", e) })
