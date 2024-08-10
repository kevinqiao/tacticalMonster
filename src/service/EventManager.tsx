import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Subject } from "rxjs";
export declare type EventModel = {
  name: string;
  topic?: string;
  time?: number;
  delay: number;
  data?: any;
};
interface IContextProps {
  subject: Subject<EventModel> | null;
}

export const EventContext = createContext<IContextProps>({
  subject: null,
} as IContextProps);

export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const subject = useMemo(() => {
    return new Subject<EventModel>();
  }, []);
  return <EventContext.Provider value={{ subject: subject }}>{children}</EventContext.Provider>;
};

const useEventSubscriber = (selectors: string[], topics?: string[]) => {
  const [event, setEvent] = useState<EventModel | null>(null);
  const { subject } = useContext(EventContext);
  useEffect(() => {
    if (subject) {
      const observable = subject.asObservable();
      const subscription = observable.subscribe((event: EventModel) => {
        if (
          (!topics || topics.length === 0 || !event.topic || topics?.includes(event.topic)) &&
          (selectors?.length === 0 || selectors.includes(event.name))
        ) {
          setEvent(event);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [selectors, topics, subject]);

  const createEvent = useCallback(
    (event: EventModel) => {
      if (subject) {
        setTimeout(() => subject.next(event), event.delay);
      }
    },
    [subject]
  );
  return { event, createEvent };
};
export default useEventSubscriber;
