const {Subject, EMPTY, of} = require('rx')
const {mergeMap, takeUntil, filter, tap, map, switchMap, catchError, switchMapTo} = require('rx/operators')
const log = require('sepal/log').getLogger('task')
const {executeTask$} = require('./taskRunner')
const {lastInWindow, repeating} = require('sepal/rxjs/operators')
const http = require('sepal/httpClient')
const {sepalHost, sepalUsername, sepalPassword} = require('./config')

const MIN_TIME_BETWEEN_NOTIFICATIONS = 1 * 1000
const MAX_TIME_BETWEEN_NOTIFICATIONS = 60 * 1000

const task$ = new Subject()
const cancel$ = new Subject()

const msg = (id, msg) => `Task [${id.substr(-4)}]: ${msg}`

const submitTask = task => {
    log.debug(msg(task.id, 'submitted'))
    task$.next(task)
}

const cancelTask = id => {
    log.debug(msg(id, 'cancellation requested'))
    cancel$.next(id)
}

const taskStateChanged$ = (id, state, message) => {
    log.debug(() => msg(id, `notifying state change: ${state}`))
    return http.postForm$(`https://${sepalHost}/api/tasks/task/${id}/state-updated`, {
        body: {
            state,
            statusDescription: message
        },
        username: sepalUsername,
        password: sepalPassword
    }).pipe(
        catchError(error => {
            log.error(msg(id, `could not notify state change: ${state}`), error)
            return EMPTY
        }),
        tap(() =>
            log.trace(() => msg(id, `notified state change: ${state}`))
        ),
        switchMapTo(EMPTY)
    )
}

const taskProgressed$ = (id, progress) => {
    log.debug(() => msg(id, `notifying progress update: ${progress.defaultMessage}`))
    return http.post$(`https://${sepalHost}/api/tasks/active`, {
        query: {progress: {[id]: progress}},
        username: sepalUsername,
        password: sepalPassword
    }).pipe(
        catchError(error => {
            log.error(msg(id, `could not notify progress update: ${progress.defaultMessage}`), error)
            return EMPTY
        }),
        tap(() =>
            log.trace(() => msg(id, `notified progress update: ${progress.defaultMessage}`))
        ),
        switchMapTo(EMPTY)
    )
}

const taskFailed$ = (id, error) =>
    taskStateChanged$(id, 'FAILED', {
        defaultMessage: 'Failed to execute task: ',
        messageKey: 'tasks.status.failed',
        messageArgs: {error: String(error)}
    })

const taskCompleted$ = id =>
    taskStateChanged$(id, 'COMPLETED', {
        defaultMessage: 'Completed!',
        messageKey: 'tasks.status.completed'
    })

task$.pipe(
    mergeMap(task =>
        executeTask$(task).pipe(
            takeUntil(cancel$.pipe(
                filter(id => id === task.id),
                tap(() => log.debug(msg(task.id, 'cancelled'))),
            )),
            switchMap(progress =>
                progress.state === 'COMPLETED'
                    ? taskCompleted$(task.id)
                    : of(progress)
            ),
            catchError(error =>
                taskFailed$(task.id, error)
            ),
            // Prevent progress notification to Sepal more often than MIN_TIME_BETWEEN_NOTIFICATIONS millis
            // This is to prevent flooding Sepal with too many updates
            lastInWindow(MIN_TIME_BETWEEN_NOTIFICATIONS),
            // Make sure progress notification to Sepal is sent at least every MAX_TIME_BETWEEN_NOTIFICATIONS millis
            // This prevents Sepal from thinking something gone wrong. Essentially repeating the last message as heartbeats
            repeating(progress => taskProgressed$(task.id, progress), MAX_TIME_BETWEEN_NOTIFICATIONS),
        )
    )
).subscribe({
    // next: v => log.fatal('*** STATE', v),
    error: error => log.fatal('Task stream failed unexpectedly:', error),
    complete: () => log.fatal('Task stream completed unexpectedly')
})

module.exports = {submitTask, cancelTask}