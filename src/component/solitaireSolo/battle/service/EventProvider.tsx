import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useSoloGameManager } from './GameManager';
import useDragHandler from './handler/useDragHandler';
import useGameHandler from './handler/useGameHandler';
const enum EventCategory {
    GAME = "game",
    DRAG = "drag",
}
const eventCategoryMap: { [k: string]: EventCategory } = {
    "shuffle": EventCategory.GAME,
    "deal": EventCategory.GAME,
    "init": EventCategory.GAME,
}
export interface MatchEvent {
    id: string;
    name: string;
    actor?: string;
    gameId?: string;
    time?: number;
    status?: number;//
    data?: any;
}
interface EventContextType {
    eventQueue: MatchEvent[];
    addEvent: (event: MatchEvent) => void;
    removeEvent: (eventId: string) => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

interface EventProviderProps {
    children: ReactNode;
}

// 如果一定要保留 EventHandle，需要这样修改
const EventHandle: React.FC<{
    children: ReactNode;
    eventQueue: MatchEvent[];
    onProcessed: (eventId: string) => void;
}> = ({ children, eventQueue, onProcessed }) => {
    const gameHandler = useGameHandler();
    const dragHandler = useDragHandler();

    useEffect(() => {
        if (eventQueue.length > 0) {
            const event = eventQueue[0];
            if (!event.status || event.status === 0) {
                const category = eventCategoryMap[event.name];

                const onComplete = () => {
                    onProcessed(event.id);
                };

                switch (category) {
                    case EventCategory.GAME:
                        gameHandler.handleEvent(event);
                        onComplete();
                        break;
                    case EventCategory.DRAG:
                        dragHandler.handleEvent(event);
                        onComplete();
                        break;
                    default:
                        onComplete();
                        break;
                }
            }
        }
    }, [eventQueue, gameHandler, dragHandler, onProcessed]);

    return <>{children}</>;
};

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
    const { gameState, cardsLoaded } = useSoloGameManager();
    const [eventQueue, setEventQueue] = useState<MatchEvent[]>([]);
    // console.log("eventQueue", eventQueue);
    const addEvent = useCallback((event: MatchEvent) => {
        setEventQueue(prev => [...prev, event]);
    }, []);

    const removeEvent = useCallback((eventId: string) => {
        setEventQueue(prev => prev.filter(e => e.id !== eventId));
    }, []);


    const value: EventContextType = {
        eventQueue,
        addEvent,
        removeEvent
    };
    useEffect(() => {
        if (!gameState) return;
        const loadedCards = gameState.cards.every(c => c.ele);
        console.log("gameState", gameState, loadedCards)
        addEvent({
            id: Date.now().toString(),
            name: "init",
        });

    }, [gameState, addEvent]);


    return (
        <EventContext.Provider value={value}>
            <EventHandle
                eventQueue={eventQueue}
                onProcessed={removeEvent}
            >{children}
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