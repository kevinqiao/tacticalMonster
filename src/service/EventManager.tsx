import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
export declare type EventModel = {
  name: string;
  topic?: string;
  time?: number;
  delay: number;
  data?: any;
};
interface IEventContext {
  event: EventModel | null;
  createEvent: (event: EventModel) => void;
}

const EventContext = createContext<IEventContext | undefined>(undefined);

export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const [event, setEvent] = useState<EventModel | null>(null);
  console.log("event provider");
  const createEvent = useCallback((newEvent: EventModel) => {
    setEvent((prevEvent) => {
      if (prevEvent && prevEvent.name === newEvent.name && prevEvent.topic === newEvent.topic) {
        return prevEvent; // 如果 event 没有变化，不更新状态
      }
      return newEvent;
    });
  }, []);

  const contextValue = useMemo(() => {
    return { event, createEvent };
  }, [event, createEvent]);

  return <EventContext.Provider value={contextValue}>{children}</EventContext.Provider>;
};

const useEventSubscriber = (selectors: string[], topics: string[], subscriber?: string) => {
  const [filterEvent, setFilterEvent] = useState<EventModel | null>(null);
  const { event, createEvent } = useContext(EventContext) as IEventContext;
  const preEventRef = useRef<EventModel | null>(null);
  console.log("event subscriber:" + subscriber);
  useEffect(() => {
    console.log("useEffect triggered in useEventSubscriber", { event, selectors, topics });

    if (
      event &&
      (topics.length === 0 || (event.topic && topics.includes(event.topic))) &&
      (selectors.length === 0 || selectors.includes(event.name))
    ) {
      if (preEventRef.current === null || event.name !== preEventRef.current.name) {
        setFilterEvent(event);
        preEventRef.current = event;
      }
    }
  }, [event, selectors, topics]);

  return { event: filterEvent || preEventRef.current, createEvent };
};
export default useEventSubscriber;
