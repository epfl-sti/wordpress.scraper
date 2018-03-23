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
 * a function that returns a generator. */
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

function scrape (opts) {
  const { start, keep_p, parsed, error } = opts
  visited = {}
  visited[start] = true

  function scrape_at (url) {
    co(scrape_step, url)
      .then(function(scrape_results) {
        let { $, urls_found } = scrape_results
        parsed(url, $)
        for (let url of urls_found()) {
          if (! keep_p(url)) continue
          url_txt = URL.format(url, {fragment: false})
          if (visited[url_txt]) continue
          visited[url_txt] = true
          scrape_at(url_txt)
        }
      })
      .catch(function(e) {
        if (error) {
          error(url, e)
        } else {
          console.log("ERROR", e)
        }
      })
  }

  scrape_at(start)
}

scrape({
  start: "https://sti-test.epfl.ch/", 
  keep_p: (url) => url.origin === "https://sti-test.epfl.ch",
  parsed(url, $) {
    console.log('Parsed ' + url)
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

