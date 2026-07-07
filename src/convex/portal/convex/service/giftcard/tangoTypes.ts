export type TangoCreateOrderArgs = {
  accountIdentifier: string;
  utid: string;
  amount: number;
  externalRefID: string;
  recipientEmail?: string;
  sendEmail?: boolean;
};

export type TangoCreateOrderResult = {
  referenceOrderID: string;
  orderId?: string;
  rewardLink?: string;
};

export type TangoGetOrderResult = {
  referenceOrderID: string;
  orderId?: string;
  status?: string;
  rewardLink?: string;
};
