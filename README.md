# React Web Worker Example

## Dev.to Post

### React: Prevent UI Blocking from Busy Logic Using Web Workers API

I recently received a task from a company I applied to that I had to implement the socket server using node.js. There is some logic that has to be executed when it receives data from the client. To avoid unnecessary delays in network interaction caused by the logic, I used worker threads. After that, I was wondering if there is a way to use worker threads in the web browser and I remembered there is Web Workers API. I had completely forgotten about it since I hadn't used it in any of my projects before. So, I decided to give it a try and write a post about it.

There's something I remember at my first company. My colleagues had to write some calculation logic with a bunch of data from a JSON file using `jQuery`. After writing the logic, he found that it blocked the entire UI. As a solution, he delayed the start of the logic with `setTimeout` and displayed a loading icon. Although the loading icon was blocked as well, at least, users noticed that something was processing by looking at the loading icon. Come to think of it, it was a good place to use Web Workers API but I didn't know at that time.

In this post, I will show you how to avoid UI blocking using Web Workers API.

> [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_AP) makes it possible to run a script operation in a background thread separate from the main execution thread of a web application.

You can run javascript code in the background, therefore, you can prevent UI blocking caused in the main executing thread.

Without further ado, let's dive into the code!

---

## UI Blocking Example

I will show you an example where the UI is blocked by executing busy logic.

![Test UI](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/q0m4iaezp1q0pahqghbx.png)

The UI of the example is simple. When the log is clicked, it prints a bunch of logs and we will see if we can change the textbox while it's executing.

Here's the log `onClick` event handler code.

```typescript
const log = () => {
  for (let i = 0; i < 1000000; i++) {
    console.log('test');
  }
  console.log('done');
};
```

If you click the button, it prints 'test' one million times, and you won't change the text of the input box for a while.

![UI Blocking](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/2cm02z3wvf15z0hynazm.png)

I pressed the button and I couldn't change the text for seconds. Now, let's move on to the implementation using Web Workers API and you will see if it prevents the UI blocking.

---

## React Web Workers API Implementation

Here's [a web worker example code from MDN](https://github.com/mdn/dom-examples/tree/main/web-workers/simple-web-worker).

But I approached it a bit different way as it's implemented in a React project. Please keep in mind that I didn't put much time into implementing it, so it may not be the best way. I'm sure you can improve the logic better.

Here are the things that I wanted to implement to use Web Workers API in a React app.

- Create a specific number of workers and reuse them to avoid overhead during creation and termination.
- Communicate with Web Workers through React custom hook.
- Get the response from the worker via a callback function.

![Implementation Explanation](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/ik38n6mj4l7ivfts7wnr.png)

The above image is a sketch of the code implementation of my code to help you a better understanding of the concept.

---

### Web Worker Script

I created the javascript file `worker.js` under the `public` folder, defined two functions, and wrote the logic, receiving a message and sending the response back.

```javascript
const sum = (nums) => {
  let total = 0;
  for (const n of nums) {
    total += n;
  }

  return total;
};

const log = (values) => {
  for (const v of values) {
    console.log(v);
  }
};

onmessage = (e) => {
  try {
    let rst;

    switch (e.data.funcName) {
      case 'sum': {
        rst = sum(e.data.args);
        break;
      }
      case 'log':
        log(e.data.args);
        break;
      default:
        throw new Error('Called undefined function');
    }

    postMessage({ result: true, rst });
  } catch (e) {
    postMessage({ result: false, err: e });
  }
};
```

The `sum` function is an example to show how to handle the response from the web worker.
The `log` function prints all the items of the array it received

I handled the event data as JSON, but you can use any format whatever you want, it doesn't need to be the JSON format.

---

### Custom Hook useWorker

```typescript
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
interface WorkerContextType {
  callWorker: (call: WorkerCall) => void;
}
interface WorkerContextProviderProps {
  workerPoolNum: number;
  children: ReactNode;
}

type WorkerPool = {
  worker: Worker;
  status: WorkerPoolStatus;
};

type WorkerPoolStatus = 'ready' | 'processing';

type Sum = {
  funcName: 'sum';
  args: number[];
  cb: (total: number) => void;
  err: (e: Error) => void;
};

type Log = {
  funcName: 'log';
  args: string[];
  cb: VoidFunction;
  err: (e: Error) => void;
};

type WorkerCall = Sum | Log;

const WorkerContext = createContext<WorkerContextType>(null!);

export const WorkerContextProvider = ({
  workerPoolNum,
  children,
}: WorkerContextProviderProps) => {
  const [workers, setWorkers] = useState<WorkerPool[]>([]);
  const [callQueue, setCallQueue] = useState<WorkerCall[]>([]);

  const callWorker: WorkerContextType['callWorker'] = useCallback(
    (workerCall) => {
      setCallQueue((prevQueue) => prevQueue.concat(workerCall));
    },
    []
  );

  useEffect(() => {
    if (!callQueue.length) return;

    const freeWorker = workers.find((w) => w.status === 'ready');
    if (!freeWorker) return;

    const firstCall = callQueue.shift();
    if (!firstCall) return;

    const call = {
      funcName: firstCall.funcName,
      args: firstCall.args,
    };

    freeWorker.status = 'processing';
    freeWorker.worker.postMessage(call);
    freeWorker.worker.onmessage = (e) => {
      freeWorker.status = 'ready';
      setWorkers((prevWorkers) => [...prevWorkers]);

      if (!e.data.result) {
        firstCall.err(e.data.err);
        return;
      }

      firstCall.cb(e.data.rst);
    };

    setWorkers((prevWorkers) => [...prevWorkers]);
  }, [callQueue, workers]);

  useEffect(() => {
    const newWorkers: WorkerPool[] = [];

    for (let i = 0; i < workerPoolNum; i++) {
      newWorkers.push({ worker: new Worker('/worker.js'), status: 'ready' });
    }

    setWorkers(newWorkers);

    return () => {
      setWorkers((prevWorkers) => {
        for (const w of prevWorkers) {
          w.worker.terminate();
        }
        return [];
      });
    };
  }, [workerPoolNum]);

  return (
    <WorkerContext.Provider value={{ callWorker }}>
      {children}
    </WorkerContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWorker = () => {
  return useContext(WorkerContext);
};

export default WorkerContext;
```

The `useWorker` hook is implemented using React Context. It generates the `workerPoolNum` number of workers. If the number of workers is two, you can execute two functions simultaneously, but it depends on your computer's performance.

In a React component, you can reserve a function call using `callWorker`. The `callWorker` function will add your function call to the `callQueue`.

Whenever workers or `callQueue` is updated, it sees if there is an available worker and calls the function using the available worker, if there isn't any available worker, it suspends the call. When one of the tasks is done, the status of the worker will be changed to `ready` from `processing` and the worker will execute the next call from the `callQueue`.

In the example code, you may need to consider implementing additional code to stop processing workers just in case like when components are unmounted.

---

### Test App

```typescript
import { WorkerContextProvider, useWorker } from './hooks/useWorker';

const Test = () => {
  const { callWorker } = useWorker();

  const sum = () => {
    callWorker({
      funcName: 'sum',
      args: Array(1000000)
        .fill(0)
        .map((_, i) => i),
      cb: (total) => {
        console.log('done: ', total);
      },
      err: (e) => {
        console.error(e);
      },
    });
  };

  const log = () => {
    callWorker({
      funcName: 'log',
      args: Array(1000000).fill('test'),
      cb: () => {
        console.log('done');
      },
      err: (e) => {
        console.error(e);
      },
    });
  };

  return (
    <div>
      <input type="text" />
      <button onClick={log}>Log</button>
      <button onClick={sum}>Sum</button>
    </div>
  );
};

function App() {
  return (
    <WorkerContextProvider workerPoolNum={2}>
      <Test />
    </WorkerContextProvider>
  );
}

export default App;
```

The sum and log functions call a function written in the worker script file using `callWorker`.

![Changing text input while the logic processing](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/zaqpgnnph8aq0ooxuwpp.png)

Now, it doesn't cause any UI blocking. You can check the demo [here](https://hsk-kr.github.io/react-webworker-example/).

---

## Web Workers API Restriction

1. You can send message only [basic data type](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort/postMessage#message). You can transfer transferable objects from one context to another through the `transfer` option. [Here are more details] (https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects). Since workers can make network requests, you may consider receiving data from the server as an option.
2. [You can't directly manipulate the DOM from inside a worker, or use some default methods and properties of the window object.](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers). You should first consider what should be implemented on the worker side to maximize the benefits of using Web Workers API.

You can find more details in [MDN - Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API).

---

## Thanks!

I hope you find it helpful.

Happy Coding!

---

You can check the demo and the code example here.

[Demo](https://hsk-kr.github.io/react-webworker-example/)

[Github Code](https://github.com/hsk-kr/react-webworker-example)

## Demo

[https://hsk-kr.github.io/react-webworker-example/](https://hsk-kr.github.io/react-webworker-example/)

## References

- https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- https://www.geeksforgeeks.org/how-to-run-a-function-in-a-separate-thread-by-using-a-web-worker-in-javascript/
