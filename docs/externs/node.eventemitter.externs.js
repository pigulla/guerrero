/**
 * To access the EventEmitter class, `require('events').EventEmitter`.
 *
 * When an `EventEmitter` instance experiences an error, the typical action is to emit an `'error'` event. Error events
 * are treated as a special case in node. If there is no listener for it, then the default action is to print a stack
 * trace and exit the program.
 *
 * All EventEmitters emit the event `'newListener'` when new listeners are added and `'removeListener'` when a listener
 * is removed.
 *
 * @class node.events.EventEmitter
 */

/**
 * Adds a listener to the end of the listeners array for the specified event.
 *
 *     server.on('connection', function (stream) {
 *         console.log('someone connected!');
 *     });
 *
 * @method addListener
 * @alias on
 * @chainable
 * @param {string} event
 * @param {Function} listener
 */

/**
 * Alias for {@link #addListener}.
 *
 * @method on
 * @chainable
 * @inheritdoc #addListener
 */

/**
 * Adds a *one time* listener for the event. This listener is invoked only the next time the event is fired, after which
 * it is removed.
 *
 * @method once
 * @chainable
 * @param {string} event
 * @param {Function} listener
 */

/**
 * Remove a listener from the listener array for the specified event. *Caution:* changes array indices in the listener
 * array behind the listener.
 *
 * @method removeListener
 * @chainable
 * @param {string} event
 * @param {Function} listener
 */

/**
 * Removes all listeners, or those of the specified event.
 *
 * @method removeAllListeners
 * @chainable
 * @param {string=} event
 */

/**
 * By default EventEmitters will print a warning if more than 10 listeners are added for a particular event. This is a
 * useful default which helps finding memory leaks. Obviously not all Emitters should be limited to 10. This function
 * allows that to be increased. Set to zero for unlimited.
 *
 * @method setMaxListeners
 * @param {number} n
 */

/**
 * Returns an array of listeners for the specified event.
 *
 *     server.on('connection', function (stream) {
 *       console.log('someone connected!');
 *     });
 *     console.log(util.inspect(server.listeners('connection'))); // [ [Function] ]
 *
 * @method listeners
 * @param {string} event
 */

/**
 * Execute each of the listeners in order with the supplied arguments.
 *
 * @method emit
 * @param {string} event
 * @param {*...} args
 * @return {boolean} Returns `true` if event had listeners, `false` otherwise.
 */

/**
 * Return the number of listeners for a given event.
 *
 * @static
 * @method listenerCount
 * @param {node.events.EventEmitter} emitter
 * @param {string} event
 * @return {number}
 */

/**
 * This event is emitted any time someone adds a new listener.
 *
 * @event newListener
 * @param {string} event The event name
 * @param {Function} listener The event handler function
 */

/**
 * This event is emitted any time someone removes a listener.
 *
 * @event removeListener
 * @param {string} event The event name
 * @param {Function} listener The event handler function
 */
