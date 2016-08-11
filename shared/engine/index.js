// @flow
// Handles sending requests to the daemon
import Session from './session'
import setupLocalLogs from '../util/local-log'
import type {WaitingHandlerType, MethodKey, SessionIDKey} from './index'
import type {createClientType} from './platform-specific'
import type {incomingCallMapType, logUiLogRpcParam} from '../constants/types/flow-types'
import {constants} from '../constants/types/keybase-v1'
import {log} from '../native/log/logui'
import {printOutstandingRPCs} from '../local-debug'
import {resetClient, createClient, rpcLog} from './platform-specific'

const {logLocal} = setupLocalLogs()

class Engine {
  // Tracking outstanding sessions
  _sessionsMap: {[key: SessionIDKey]: Session} = {}
  // Helper we delegate actual calls to
  _rpcClient: createClientType
  // All incoming call handlers
  _incomingHandler: {[key: MethodKey]: (param: Object, response: ?Object) => void} = {}
  // Keyed methods that care when we reconnect
  _onConnectHandlers: {[key: string]: () => void} = {}
  // Set to true to throw on errors. Used in testing
  _failOnError: boolean = false
  // We generate sessionIDs monotonically
  _nextSessionID: number = 123

  constructor () {
    this._rpcClient = createClient(
      payload => this._rpcIncoming(payload),
      () => this._onConnected()
    )

    this._setupCoreHandlers()
    this._setupDebugging()
  }

  _setupDebugging () {
    if (!__DEV__) {
      return
    }

    if (typeof window !== 'undefined') {
      console.log('DEV MODE ENGINE AVAILABLE AS window.DEBUGengine')
      window.DEBUGengine = this
    }

    // Print out any alive sessions periodically
    if (printOutstandingRPCs) {
      setInterval(() => {
        if (Object.keys(this._sessionsMap).length) {
          logLocal('outstandingSessionDebugger: ', this._sessionsMap)
        }
      }, 10 * 1000)
    }
  }

  // Default handlers for incoming messages
  _setupCoreHandlers () {
    this.setIncomingHandler('keybase.1.logUi.log', (param, response) => {
      const logParam: logUiLogRpcParam = param
      log(logParam)
      response && response.result && response.result()
    })
  }

  // Called when we reconnect to the server
  _onConnected () {
    // Make a copy so we don't mutate while calling the handlers
    const handlers = {...this._onConnectHandlers}
    Object.keys(handlers).forEach(k => handlers[k]())
  }

  // Create and return the next unique session id
  _generateSessionID (): number {
    this._nextSessionID++
    return this._nextSessionID
  }

  // Got a cancelled sequence id
  _handleCancel (seqid: number) {
    const cancelledSessionID = Object.keys(this._sessionsMap).find(key => this._sessionsMap[key].hasSeqID(seqid))
    if (cancelledSessionID) {
      rpcLog('engineInternal', 'Received cancel for session', cancelledSessionID)
      this._sessionsMap[cancelledSessionID].end()
    } else {
      rpcLog('engineInternal', "Received cancel but couldn't find session", cancelledSessionID)
    }
  }

  // Got an incoming request with no handler
  _handleUnhandled (sessionID: number, method: MethodKey, seqid: number, param: Object, response: ?Object) {
    if (__DEV__) {
      logLocal(`Unknown incoming rpc: ${sessionID} ${method} ${seqid} ${JSON.stringify(param)}${response ? ': Sending back error' : ''}`)
    }
    console.warn(`Unknown incoming rpc: ${sessionID} ${method}`)

    if (__DEV__ && this._failOnError) {
      throw new Error(`unhandled incoming rpc: ${sessionID} ${method} ${JSON.stringify(param)}${response ? '. has response' : ''}`)
    }

    response && response.error && response.error({
      code: constants.StatusCode.scgeneric,
      desc: `Unhandled incoming RPC ${sessionID} ${method}`,
    })
  }

  // An incoming rpc call
  _rpcIncoming (payload: {method: MethodKey, param: Array<Object>, response: ?Object}) {
    const {method, param: incomingParam, response} = payload
    const param = incomingParam && incomingParam.length ? incomingParam[0] : {}
    const {seqid, cancelled} = response || {seqid: 0, cancelled: false}
    const {sessionID} = param

    if (cancelled) {
      this._handleCancel(seqid)
    } else {
      const session = this._sessionsMap[String(sessionID)]
      if (session) { // Part of a session?
        session.incomingCall(method, param, response)
      } else if (this._incomingHandler[method]) { // General incoming
        const handler = this._incomingHandler[method]
        rpcLog('engineInternal', 'Handling incoming')
        handler(param, response)
      } else { // Unhandled
        this._handleUnhandled(sessionID, method, seqid, param, response)
      }
    }
  }

  // An outgoing call. ONLY called by the flow-type rpc helpers
  _rpcOutgoing (params: {
    method: MethodKey,
    param: ?Object,
    incomingCallMap: incomingCallMapType,
    callback: () => void, waitingHandler: WaitingHandlerType}) {
    let {method, param, incomingCallMap, callback, waitingHandler} = params

    // Ensure a non-null param
    if (!param) {
      param = {}
    }

    // Make a new session and start the request
    const session = this._createSession(incomingCallMap, waitingHandler)
    session.start(method, param, callback)
    return session.id
  }

  // Make a new session
  _createSession (incomingCallMap: incomingCallMapType, waitingHandler: ?WaitingHandlerType): Session {
    const sessionID = this._generateSessionID()
    rpcLog('engineInternal', `Session start ${sessionID}`)

    const session = new Session(
      sessionID,
      incomingCallMap,
      waitingHandler,
      (method, param, cb) => this._rpcClient.invoke(method, param, cb),
      (session: Session) => this._sessionEnded(session))

    this._sessionsMap[String(sessionID)] = session
    return session
  }

  // Cleanup a session that ended
  _sessionEnded (session: Session) {
    rpcLog('engineInternal', `Session end ${session.id}`)
    delete this._sessionsMap[String(session.id)]
  }

  // Cancel an rpc
  cancelRPC (response: ?{error: () => void}, error: any) {
    if (response) {
      if (response.error) {
        const cancelError = {
          code: constants.StatusCode.scgeneric,
          desc: 'Canceling RPC',
        }

        response.error(error || cancelError)
      }
    } else {
      logLocal('Invalid response sent to cancelRPC')
    }
  }

  // Reset the engine
  reset () {
    resetClient()
  }

  // Setup a handler for a rpc w/o a session (id = 0)
  setIncomingHandler (method:MethodKey, handler: (param: Object, response: ?Object) => void) {
    if (this._incomingHandler[method]) {
      rpcLog('engineInternal', "Duplicate incoming handler!!!! This isn't allowed", method)
      return
    }
    rpcLog('engineInternal', 'Registering incoming handler:', method)
    this._incomingHandler[method] = handler
  }

  // Test want to fail on any error
  setFailOnError () {
    this._failOnError = true
  }

  // Register a named callback when we reconnect to the server. Call if we're already connected
  listenOnConnect (key: string, f: () => void) {
    if (!f) {
      throw new Error('Null callback sent to listenOnConnect')
    }

    // The transport is already connected, so let's call this function right away
    if (!this._rpcClient.transport.needsConnect) {
      f()
    }

    // Regardless if we were connected or not, we'll add this to the callback fns
    // that should be called when we connect.
    this._onConnectHandlers[key] = f
  }
}

// Dummy engine for snapshotting
class FakeEngine {
  _sessionsMap: {[key: SessionIDKey]: Session};
  constructor () {
    console.log('Engine disabled!')
    this._sessionsMap = {}
  }
  reset () {}
  cancelRPC () {}
  rpc () {}
  setFailOnError () {}
  listenOnConnect () { }
}

const engine = process.env.KEYBASE_NO_ENGINE ? new FakeEngine() : new Engine()

export default engine
