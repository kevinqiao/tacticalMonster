import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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
  const createEvent = useCallback((e: EventModel) => {
    console.log(e);
    setEvent(e);
    // setTimeout(() => {
    //   setEvent(e);
    // }, e.delay);
  }, []);

  return <EventContext.Provider value={{ event, createEvent }}>{children}</EventContext.Provider>;
};

const useEventSubscriber = (selectors?: string[], topics?: string[], subscriber?: string) => {
  const [filterEvent, setFilterEvent] = useState<EventModel | null>(null);
  const { event, createEvent } = useContext(EventContext) as IEventContext;

  useEffect(() => {
    if (
      event &&
      ((topics && topics.length === 0) || (topics && event.topic && topics.includes(event.topic))) &&
      ((selectors && selectors.length === 0) || (selectors && selectors.includes(event.name)))
    ) {
      // console.log(event);
      setFilterEvent(event);
    }
  }, [event, selectors, topics]);

  return { event: filterEvent, createEvent };
};
export default useEventSubscriber;
