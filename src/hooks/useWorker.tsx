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
