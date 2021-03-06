package component.workersession

import org.openforis.sepal.component.workersession.api.InstanceManager
import org.openforis.sepal.component.hostingservice.api.InstanceType
import org.openforis.sepal.component.workersession.api.WorkerInstance
import org.openforis.sepal.component.workersession.api.WorkerSession

import java.util.concurrent.TimeUnit

class FakeInstanceManager implements InstanceManager {
    private final Map<String, WorkerInstance> instanceById = [:]
    private final List<WorkerInstance> released = []
    private boolean fail
    private List<Closure> instanceActivatedListeners = []
    private List<Closure> provisionFailureListeners = []
    private List<WorkerSession> pendingOrActiveSessions = []
    List<InstanceType> instanceTypes = []

    WorkerInstance requestInstance(WorkerSession session) {
        if (fail) throw new IllegalStateException('Failed to request instance')
        def instance = new WorkerInstance(
                id: UUID.randomUUID().toString(),
                host: UUID.randomUUID().toString()
        )
        instanceById[instance.id] = instance
        return instance
    }

    void releaseInstance(String instanceId) {
        def instance = instanceById[instanceId]
        assert instance, "Instance with id $instanceId not requested. Got ${instanceById.values()}"
        released << instance
    }

    void onInstanceActivated(Closure listener) {
        instanceActivatedListeners << listener
    }

    void onFailedToProvisionInstance(Closure listener) {
        provisionFailureListeners << listener
    }

    void releaseUnusedInstances(List<WorkerSession> pendingOrActiveSessions, int minAge, TimeUnit timeUnit) {
        this.pendingOrActiveSessions.clear()
        this.pendingOrActiveSessions.addAll(pendingOrActiveSessions)
    }

    List<WorkerSession> sessionsWithoutInstance(List<WorkerSession> workerSessions) {
        return workerSessions.findAll {
            !instanceById.containsKey(it.instance.id) || it.instance in released
        }
    }

    WorkerInstance requestedOne() {
        assert allInstances().size() == 1,
                "Expected one requested instance. Actually requested ${allInstances().size()}: ${allInstances()}"
        return allInstances().first()
    }

    void releasedNone() {
        assert released.empty,
                "Expected no released instances. Actually released ${released.size()}: ${released}"
    }

    WorkerInstance releasedOne() {
        assert released.size() == 1,
                "Expected one released instance. Actually released ${released.size()}: ${released}"
        return released.first()
    }

    void fail() {
        fail = true
    }

    WorkerInstance activate(String instanceId) {
        def instance = instanceById[instanceId]
        instanceActivatedListeners*.call(instance)
    }

    WorkerInstance provisioningFailed(String instanceId) {
        def instance = instanceById[instanceId]
        provisionFailureListeners*.call(instance)
    }

    private List<WorkerInstance> allInstances() {
        instanceById.values().toList()
    }

    void releasedUnused(WorkerSession... expectedPendingOrActiveSessions) {
        def sessions = pendingOrActiveSessions.collect { it.id }.toSet()
        def expected = expectedPendingOrActiveSessions.collect { it.id }.toSet()
        assert sessions == expected,
                "Expected ${expected.size()} sessions passed when releasing unused instances not provided. " +
                        "got ${sessions.size()}: $expected"
    }
}
