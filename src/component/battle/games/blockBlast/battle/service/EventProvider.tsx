/**
 * Block Blast 事件提供者
 * 基于 solitaireSolo 的事件系统
 */

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import useEventHandler from './handler/useEventHandler';

const enum EventCategory {
    GAME = "game",
    DRAG = "drag",
    NON_BLOCK = "nonBlock",
}

const eventCategoryMap: { [k: string]: EventCategory } = {
    "placeShape": EventCategory.GAME,
    "clearLines": EventCategory.GAME,
    "init": EventCategory.GAME,
    "drop": EventCategory.GAME,
    "gameOver": EventCategory.NON_BLOCK,
};

export interface MatchEvent {
    id: string;
    name: string;
    actor?: string;
    gameId?: string;
    time?: number;
    status?: number;
    data?: any;
}

interface EventContextType {
    eventQueue: MatchEvent[];
    nonBlockEvent: MatchEvent | undefined;
    addEvent: (event: MatchEvent) => void;
    removeEvent: (eventId: string) => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

interface EventProviderProps {
    children: ReactNode;
}

const EventHandle: React.FC<{
    children: ReactNode;
    eventQueue: MatchEvent[];
    onComplete: (eventId: string) => void;
}> = ({ children, eventQueue, onComplete }) => {
    const eventHandler = useEventHandler();

    useEffect(() => {
        if (eventQueue.length > 0) {
            const event = eventQueue[0];
            if (!event.status || event.status === 0) {
                eventHandler.handleEvent(event, onComplete);
            }
        }
    }, [eventQueue, eventHandler, onComplete]);

    return <>{children}</>;
};

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
    const [eventQueue, setEventQueue] = useState<MatchEvent[]>([]);
    const [nonBlockEvent, setNonBlockEvent] = useState<MatchEvent>();

    const addEvent = useCallback((event: MatchEvent) => {
        if (eventCategoryMap[event.name] === EventCategory.NON_BLOCK) {
            setNonBlockEvent(event);
        } else {
            setEventQueue(prev => [...prev, event]);
        }
    }, []);

    const removeEvent = useCallback((eventId: string) => {
        console.log("removeEvent", eventId);
        setEventQueue(prev => prev.filter(e => e.id !== eventId));
    }, []);

    const value: EventContextType = {
        eventQueue,
        nonBlockEvent,
        addEvent,
        removeEvent
    };

    return (
        <EventContext.Provider value={value}>
            <EventHandle
                eventQueue={eventQueue}
                onComplete={removeEvent}
            >
                {children}
            </EventHandle>
        </EventContext.Provider>
    );
};

export const useEventManager = (): EventContextType => {
    const context = useContext(EventContext);
    if (!context) {
        throw new Error('useEventManager must be used within an EventProvider');
    }
    return context;
};

