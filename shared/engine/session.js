// @flow
import {IncomingRequest, OutgoingRequest} from './request'
import {rpcLog} from './platform-specific'
import type {SessionID, WaitingHandlerType, EndHandlerType, MethodKey} from './index'
import type {incomingCallMapType} from '../constants/types/flow-types'
import type {invokeType} from './platform-specific'

// A session is a series of calls back and forth tied together with a single sessionID
class Session {
  // Our id
  _id: SessionID;
  // Map of methods => callbacks
  _incomingCallMap: incomingCallMapType;
  // Let the outside know we're waiting
  _waitingHandler: ?WaitingHandlerType;
  // Tell engine we're done
  _endHandler: EndHandlerType;
  // Sequence IDs we've seen. Value is true if we've responded (often we get cancel after we've replied)
  _seqIDResponded: {[key: string]: boolean} = {};

  // Allow us to make calls
  _invoke: invokeType;

  // Outstanding requests
  _outgoingRequests: Array<Object> = [];
  _incomingRequests: Array<Object> = [];

  constructor (
    sessionID: SessionID,
    incomingCallMap: incomingCallMapType,
    waitingHandler: ?WaitingHandlerType,
    invoke: invokeType,
    endHandler: EndHandlerType,
  ) {
    this._id = sessionID
    this._incomingCallMap = incomingCallMap
    this._waitingHandler = waitingHandler
    this._invoke = invoke
    this._endHandler = endHandler
  }

  set id (sessionID: SessionID) { throw new Error("Can't set sessionID") }
  get id (): SessionID { return this._id }

  // Make a waiting handler for the request. We add additional data before calling the parent waitingHandler
  // and do internal bookkeeping if the request is done
  _makeWaitingHandler (isOutgoing: boolean, method: MethodKey, seqid: ?number) {
    return (waiting: boolean) => {
      rpcLog('engineInternal', 'waiting state change', this.id, method, this, seqid)
      // Call the outer handler with all the params it needs
      this._waitingHandler && this._waitingHandler(waiting, method, this._id)

      // Request is finished, do cleanup
      if (!waiting) {
        const requests = isOutgoing ? this._outgoingRequests : this._incomingRequests
        const idx = requests.findIndex(r => r.method === method)
        if (idx !== -1) {
          // Mark us as responded
          if (seqid) {
            this._seqIDResponded[String(seqid)] = true
          }
          // Remove from our list
          requests.splice(idx, 1)
        }
      }
    }
  }

  end () {
    this._endHandler(this)
  }

  // Start the session normally. Tells engine we're done at the end
  start (method: MethodKey, param: ?Object, callback: () => void) {
    // When this request is done the session is done
    const wrappedCallback = (...args) => {
      callback(...args)
      this.end()
    }

    // Add the sessionID
    const wrappedParam = {
      ...param,
      sessionID: this.id,
    }

    rpcLog('engineInternal', 'session start call', this.id, method, this)
    const outgoingRequest = new OutgoingRequest(method, wrappedParam, wrappedCallback, this._makeWaitingHandler(true, method), this._invoke)
    this._outgoingRequests.push(outgoingRequest)
    outgoingRequest.send()
  }

  // We have an incoming call tied to a sessionID, called only by engine
  incomingCall (method: MethodKey, param: Object, response: ?Object): boolean {
    rpcLog('engineInternal', 'session incoming call', this.id, method, this, response)
    const handler = this._incomingCallMap[method]

    if (!handler) {
      return false
    }

    if (response && response.seqid) {
      this._seqIDResponded[String(response.seqid)] = false
    }

    const waitingHandler = this._makeWaitingHandler(false, method, response && response.seqid)
    const incomingRequest = new IncomingRequest(method, param, response, waitingHandler, handler)
    this._incomingRequests.push(incomingRequest)
    incomingRequest.handle()

    return true
  }

  // Tell engine if we can handle the cancelled call
  hasSeqID (seqID: number) {
    if (__DEV__) {
      if (this._seqIDResponded.hasOwnProperty(String(seqID))) {
        console.log('Cancelling seqid found, current session state', this)
      }
    }
    return this._seqIDResponded.hasOwnProperty(String(seqID))
  }
}

export default Session