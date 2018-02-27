import React from 'react'
import PropTypes from 'prop-types'
import QueryString from 'query-string'


const router = require('react-router-dom')

const renderMergedProps = (component, ...rest) => {
    return React.createElement(component, Object.assign({}, ...rest))
}

export const Route = ({component, ...rest}) => {
    return (
        <router.Route {...rest} render={routeProps => {
            return renderMergedProps(component, routeProps, rest)
        }}/>
    )
}
Route.propTypes = {
    component: PropTypes.func.isRequired
}

export const Switch = router.Switch
Switch.propTypes = {
    location: PropTypes.object.isRequired
}

export const Link = router.Link
Link.propTypes = router.Link.propTypes

export const getQuery = () => ({})
// export const getQuery = () => QueryString.parse(getLocation(state()).search)
// export const getLocation = () => reduxRouter.getLocation(state())
// export const push = reduxRouter.push
// export const replace = reduxRouter.replace
// export const go = reduxRouter.go
// export const goBack = reduxRouter.goBack
// export const goForward = reduxRouter.goForward