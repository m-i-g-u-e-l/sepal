import PropTypes from 'prop-types'
import React from 'react'
import {map} from 'rxjs/operators'
import {msg} from 'translate'
import {Panel, PanelContent, PanelHeader} from 'widget/panel'
import Portal from 'widget/portal'
import Tooltip from 'widget/tooltip'
import styles from './userProfile.module.css'
import Http from 'http-client'

const useUserGoogleAccount = (e) => {
    e.preventDefault()
    Http.get$(`/api/user/google/access-request-url?destinationUrl=${window.location.hostname}`).pipe(
        map(({response: {url}}) => url)
    ).subscribe(url => {
        console.log({url})
        return window.location = url
    })
}


export default class UserProfile extends React.Component {
    state = {
        open: false
    }

    toggleOpen() {
        this.setState(prevState => ({...prevState, open: !this.state.open}))
    }

    renderButton() {
        const {className, user} = this.props
        const {open} = this.state
        return (
            <Tooltip msg='home.sections.user.profile' top>
                <button className={className} onClick={() => this.toggleOpen()}>
                    {user.username}
                </button>
            </Tooltip>
        )
    }

    renderPanel() {
        return (
            <Portal>
                <Panel className={styles.panel} center modal>
                    <PanelHeader
                        icon='user'
                        title={msg('user.panel.title')}/>
                    <PanelContent>


                        <button onClick={(e) => useUserGoogleAccount(e)}>User user Google account</button>
                    </PanelContent>
                    {/* <PanelButtons
                        form={form}
                        statePath={recipePath(recipeId, 'ui')}
                        onApply={trainingData => this.recipeActions.setTrainingData(trainingData).dispatch()}/> */}
                </Panel>
            </Portal>
        )
    }

    render() {
        const {open} = this.state
        return (
            <React.Fragment>
                {this.renderButton()}
                {open ? this.renderPanel() : null}
            </React.Fragment>
        )
    }
}

UserProfile.propTypes = {
    className: PropTypes.string,
    user: PropTypes.object
}