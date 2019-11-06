const {of, timer} = require('rxjs')
const {mergeMap, tap, mapTo} = require('rxjs/operators')
const rateLimit = require('./job/operators/rateLimit')
const log = require('./log')

const name = 'Test'

const job = dummy => {
    log.info(`Running test ${dummy}`)
    return of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10).pipe(
        rateLimit(3, 1000),
        tap(value => log.trace(`Submitted value: ${value}`)),
        mergeMap(value =>
            timer(Math.random() * 2000).pipe(
                mapTo(value),
                tap(value => log.trace(`Got value: ${value}`)),
            )
        )
    )
}

module.exports = {name, job}