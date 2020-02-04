const {Subject, ReplaySubject, of} = require('rxjs')
const {mergeMap, map, filter, finalize, takeUntil, catchError} = require('rxjs/operators')
const {deserializeError} = require('serialize-error')
const {v4: uuid} = require('uuid')
const _ = require('lodash')
const log = require('sepal/log').getLogger('job')
const {initWorker$} = require('./factory')
const {LimitedPool} = require('./pool')

const RATE_WINDOW_MS = 100
const MAX_RATE = 1
const MAX_CONCURRENCY = 100
const MIN_IDLE_COUNT = 10
const MAX_IDLE_MS = 5000

const workerManagers = {}

const getWorkerManager = ({
    jobName,
    jobPath,
    logConfig,
    maxConcurrency = MAX_CONCURRENCY,
    minIdleCount = MIN_IDLE_COUNT,
    maxIdleMilliseconds = MAX_IDLE_MS
}) => {
    if (!workerManagers[jobName]) {
        workerManagers[jobName] = createWorkerManager({
            jobName,
            jobPath,
            logConfig,
            maxConcurrency,
            minIdleCount,
            maxIdleMilliseconds
        })
    }
    return workerManagers[jobName]
}

const jobResponse$ = wrapped$ => {
    // This function does two things:
    // 1) return an individual stream per request
    // 2) unwrap the response (value/error)
    const unwrapped$ = new ReplaySubject()
    const stop$ = new Subject()
    wrapped$.pipe(
        takeUntil(stop$)
    ).subscribe(
        ({value, error}) => {
            value && unwrapped$.next(value)
            error && unwrapped$.error(deserializeError(error))
        },
        error => unwrapped$.error(error)
        // stream is allowed to complete
    )
    return unwrapped$.pipe(
        finalize(() => stop$.next())
    )
}

const createWorkerManager = ({jobName, jobPath, logConfig, maxConcurrency, minIdleCount, maxIdleMilliseconds}) => {
    const request$ = new Subject()
    const response$ = new Subject()
    const cancel$ = new Subject()

    const workerPool = LimitedPool({
        name: `Worker/${jobName}`,
        maxIdleMilliseconds,
        minIdleCount,
        rateWindowMs: RATE_WINDOW_MS,
        maxRate: MAX_RATE,
        maxConcurrency,
        create$: instanceId => initWorker$(instanceId, jobPath, logConfig),
        onDispose: ({item}) => item.dispose(),
        onMsg: ({instanceId, action}) => `Worker instance [${instanceId}] ${action}`
    })

    request$.pipe(
        mergeMap(({requestId, args, args$}) =>
            workerPool.getInstance$().pipe(
                mergeMap(worker =>
                    worker.submit$(args, args$).pipe(
                        catchError(error => of({error})),
                        map(result => ({
                            requestId,
                            result
                        }))
                    )
                ),
                takeUntil(cancel$.pipe(
                    filter(({requestId: currentRequestId}) => currentRequestId === requestId)
                ))
            )
        ),
    ).subscribe(
        response => response$.next(response),
        error => log.fatal('Worker manager request stream failed:', error),
        () => log.fatal('Worker manager request stream completed')
    )

    return {
        submit$({args, args$}) {
            log.debug(`Submitting job [${jobName}]`)
            const requestId = uuid()
            request$.next({requestId, args, args$})
            return jobResponse$(
                response$.pipe(
                    filter(({requestId: currentRequestId}) => currentRequestId === requestId),
                    map(({result}) => result),
                    finalize(() => cancel$.next({requestId}))
                )
            )
        }
    }
}

module.exports = {getWorkerManager}