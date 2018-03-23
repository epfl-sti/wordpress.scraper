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
    .map((i, e) => new URL.URL($(e).attr('href'), base))
    .get()  // $().map() is weird in this way
}

/* Another coroutine function, but this one returns (among other things)
 * a generator. */
function* scrape_step (start) {
  let $ = yield co(url2cheerio, start)
  return {
    $,
    urls_found: function* () {
      for (let url of all_urls($, start)) {
        yield url
      }
    }
  }
}

function scrape (start, keep_cb) {
  visited = {}
  visited[start] = true

  co(scrape_step, start)
  .then(function(scrape_results) {
    let { $, urls_found } = scrape_results
    console.log('parsed ' + start)
    for (let url of urls_found()) {
      if (! keep_cb(url)) continue
      url_txt = URL.format(url, {fragment: false})
      if (visited[url_txt]) continue
      visited[url_txt] = true
      console.log('Now we could visit ' + url_txt)
    }
  })
  .catch(function(e) { console.log("ERROR", e) })
}

scrape("https://sti-test.epfl.ch/", 
       (url) => url.origin === "https://sti-test.epfl.ch")
