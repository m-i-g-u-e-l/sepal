package util

import fake.FakeUserRepository
import fake.FakeUsernamePasswordVerifier
import groovy.json.JsonOutput
import groovymvc.Controller
import groovymvc.security.BasicRequestAuthenticator
import groovymvc.security.PathRestrictions
import groovyx.net.http.HttpResponseDecorator
import groovyx.net.http.RESTClient
import org.openforis.sepal.command.Command
import org.openforis.sepal.command.CommandDispatcher
import org.openforis.sepal.command.CommandHandler
import org.openforis.sepal.command.ExecutionFailed
import org.openforis.sepal.endpoint.EndpointRegistry
import org.openforis.sepal.endpoint.Endpoints
import org.openforis.sepal.endpoint.ResourceServer
import org.openforis.sepal.query.QueryDispatcher
import spock.lang.Specification

import static groovy.json.JsonOutput.prettyPrint

@SuppressWarnings("GroovyAssignabilityCheck")
abstract class AbstractEndpointTest extends Specification {
    final queryDispatcher = Mock(QueryDispatcher)
    final commandDispatcher = Mock(CommandDispatcher)
    final userRepository = new FakeUserRepository()
    final passwordVerifier = new FakeUsernamePasswordVerifier()

    final server = new ResourceServer(Port.findFree(), '/api', new Endpoints(
            new PathRestrictions(userRepository, new BasicRequestAuthenticator('Sepal', passwordVerifier)),
            { registerEndpoint(it) } as EndpointRegistry))
    final client = new RESTClient("http://$server.host/api/")
    final testUsername = 'some-user'

    def setup() {
        client.handler.failure = { resp -> return resp }
        client.auth.basic testUsername, 'some-password'
        server.start()
    }

    def cleanup() {
        server.stop()
    }

    abstract void registerEndpoint(Controller controller);

    final nonAdmin() {
        userRepository.noRole()
    }

    final failExecution(Exception e) {
        throw new ExecutionFailed({} as CommandHandler, {} as Command, e)
    }

    final HttpResponseDecorator get(Map args) {
        return client.get(args)
    }

    final HttpResponseDecorator post(Map args) {
        return client.post(args)
    }

    final HttpResponseDecorator delete(Map args) {
        return client.delete(args)
    }

    final void sameJson(result, expectation) {
        def expectationString = prettyPrint(JsonOutput.toJson(recursiveSort(expectation)))
        def resultString = prettyPrint(JsonOutput.toJson(recursiveSort(result)))
        assert resultString == expectationString
    }

    final <T> T recursiveSort(T t) {
        if (t instanceof Map)
            t = t.each {
                t[it.key] = recursiveSort(it.value)
            }.sort()
        else if (t instanceof List)
            t.eachWithIndex { item, i ->
                t.set(i, recursiveSort(item))
            }
        return t
    }
}
