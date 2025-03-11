const Actions = {
    GET: 'get',
    REPLY: 'reply',
    EMIT: 'emit',
    ERROR: 'error',
  };
  
  export class Switchboard {
    constructor(params) {
      if (!params) return;
      this.init(params);
    }
  
    init(params) {
      const { port, name = 'switchboard', debug = false } = params;
      this.port = port;
      this.name = name;
      this.debugMode = debug;
      this.methods = {};
      this.incrementor = 1;
      this.isInitialised = false;
  
      port.addEventListener('message', async (event) => {
        this.log('message received', event);
        const message = event.data;
        if (message.switchboardAction === Actions.GET) {
          this.port.postMessage(await this.getMethodResult(message));
        } else if (message.switchboardAction === Actions.EMIT) {
          const { method, args } = message;
          const executor = this.methods[method];
          if (executor) executor(args);
        }
      });
  
      this.isInitialised = true;
    }
  
    async getMethodResult({ messageId, method, args }) {
      const executor = this.methods[method];
      if (!executor) {
        return {
          switchboardAction: Actions.ERROR,
          messageId,
          error: `[${this.name}] Method "${method}" is not defined`,
        };
      }
      try {
        const result = await executor(args);
        return {
          switchboardAction: Actions.REPLY,
          messageId,
          result,
        };
      } catch (err) {
        this.logError(err);
        return {
          switchboardAction: Actions.ERROR,
          messageId,
          error: `[${this.name}] Method "${method}" threw an error`,
        };
      }
    }
  
    defineMethod(methodName, executor) {
      this.methods[methodName] = executor;
    }
  
    get(method, args = undefined) {
      return new Promise((resolve, reject) => {
        if (!this.isInitialised) {
          reject(new Error('Switchboard not initialised'));
          return;
        }
        const messageId = this.getNewMessageId();
        const listener = (event) => {
          const message = event.data;
          if (message.messageId !== messageId) return;
          this.port.removeEventListener('message', listener);
          if (message.switchboardAction === Actions.REPLY) {
            resolve(message.result);
          } else {
            const errStr = message.switchboardAction === Actions.ERROR ? message.error : 'Unexpected response message';
            reject(new Error(errStr));
          }
        };
        this.port.addEventListener('message', listener);
        this.port.start();
        this.port.postMessage({
          switchboardAction: Actions.GET,
          method,
          messageId,
          args,
        });
      });
    }
  
    emit(method, args = undefined) {
        if (!this.isInitialised) {
            this.logError('Switchboard not initialised');
            return;
        }
        this.port.postMessage({
            switchboardAction: Actions.EMIT,
            method,
            args,
        });
    }
  
    start() {
      if (!this.isInitialised) {
        this.logError('Switchboard not initialised');
        return;
      }
      this.port.start();
    }
  
    log(...args) {
      if (this.debugMode) console.debug(`[${this.name}]`, ...args);
    }
  
    logError(...args) {
      console.error(`[${this.name}]`, ...args);
    }
  
    getNewMessageId() {
      return `m_${this.name}_${this.incrementor++}`;
    }
  }