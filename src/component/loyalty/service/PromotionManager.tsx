import { useConvex } from "convex/react";
import { Engine } from "json-rules-engine";
import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";
import useLocalization from "service/LocalizationManager";
import { usePartnerManager } from "service/PartnerManager";
interface FactModel {
  memberLevel: number;
  totalAmount: number;
  items: { inventoryId: string; quantity: number }[];
}
interface PromotionRule {
  id: string;
  priority?: number;
  conditions: any;
  event: { type: string; params: { [k: string]: string } };
}
interface IPromotionContext {
  rules: PromotionRule[] | null;
}
const PromotionContext = createContext<IPromotionContext>({
  rules: [],
});

const PromotionProvider = ({ children }: { children: ReactNode }) => {
  const [rules, setRules] = useState<PromotionRule[] | null>(null);
  const { partner } = usePartnerManager();
  const { locale } = useLocalization();
  const convex = useConvex();
  const engine = new Engine();
  const discountRule = {
    conditions: {
      all: [
        {
          fact: "totalAmount",
          operator: "greaterThanInclusive",
          value: 100, // Discount applies if totalAmount >= 100
        },
      ],
    },
    event: {
      type: "discount",
      params: {
        discountValue: 10, // Discount value is 10
        message: "You get a 10% discount!",
      },
    },
    priority: 1,
  };

  // Add the rule to the engine
  engine.addRule(discountRule);

  // Function to handle the rule evaluation
  const evaluateRule = async () => {
    const facts = { totalAmount: 1000 }; // Current state value

    engine
      .run(facts)
      .then((results) => {
        if (results.events.length > 0) {
          // const eventMessage = results.events[0].params.message;
        } else {
          console.log("fail");
        }
      })
      .catch((err) => console.log(err));
  };
  useEffect(() => {
    const fetchRules = async (pid: number) => {
      console.log("fetching rules");
    };
    if (partner && locale) {
      fetchRules(partner.pid);
    }
  }, [partner, locale]);
  const value = {
    rules,
  };
  return (
    <>
      <PromotionContext.Provider value={value}> {children} </PromotionContext.Provider>
    </>
  );
};
export const usePromotionManager = () => {
  return useContext(PromotionContext);
};
export default PromotionProvider;
