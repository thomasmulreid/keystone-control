import { FunctionDef } from "../types";

// Waiting-on-the-supplier view. Deliberately thin.
export const ACCOUNT_REQUESTS: FunctionDef = {
  id: "account-requests",
  label: "Requests",
  role: "Buyer",
  scope: "customer",
  question: "What have we asked for, and where has it got to?",

  principles: [
    "State what each status means in plain words. 'Submitted' tells a buyer nothing on its own.",
    "Show the age against the supplier's own typical turnaround, so chasing is a decision rather than a guess.",
    "No action needed from this side — say that, rather than leaving someone wondering.",
  ],

  display: {
    density: "headline",
    tiles: 4,
    queueMax: 3,
    queueCompact: true,
    tableRows: 6,
    breakdownRows: 5,
  },

  targets: [
    {
      key: "chase_after_days",
      label: "Chase a quote after",
      unit: "days",
      direction: "lower-is-better",
      value: 5,
      rationale: "Past this, a request has usually fallen off someone's desk rather than being worked.",
      owner: "Buyer",
    },
  ],

  reads: ["commerce.quotes"],
  actions: [],
};
