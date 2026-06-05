export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CASH = 'cash',
  CREDIT = 'credit',
  INVESTMENT = 'investment',
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

export enum ExpenseClassificationType {
  FIXED_OBLIGATION = 'fixed_obligation',
  VARIABLE_NECESSITY = 'variable_necessity',
  DISCRETIONARY = 'discretionary',
  SAVINGS_TRANSFER = 'savings_transfer',
}

export enum FinanceCycleStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum PendingObligationStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
}
