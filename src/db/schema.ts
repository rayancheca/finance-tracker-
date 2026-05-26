import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  date,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── ENUMS ──────────────────────────────────────────────────────────

export const accountTypeEnum = pgEnum('account_type', [
  'checking',
  'savings',
  'credit_card',
  'cash',
  'brokerage',
  'retirement',
  'other',
]);

export const categoryKindEnum = pgEnum('category_kind', [
  'income',
  'expense',
  'savings',
  'transfer',
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'income',
  'expense',
  'transfer',
]);

export const goalStatusEnum = pgEnum('goal_status', [
  'active',
  'paused',
  'completed',
  'abandoned',
]);

export const recurrenceFreqEnum = pgEnum('recurrence_freq', [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'annually',
]);

export const leaseStatusEnum = pgEnum('lease_status', [
  'active',
  'subletting',
  'released',
]);

export const aggregatorProviderEnum = pgEnum('aggregator_provider', [
  'plaid',
  'snaptrade',
  'manual',
]);

export const connectionStatusEnum = pgEnum('connection_status', [
  'pending',
  'active',
  'needs_reauth',
  'revoked',
  'error',
]);

export const syncStatusEnum = pgEnum('sync_status', [
  'idle',
  'syncing',
  'success',
  'failure',
]);

// ─── USERS ──────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  fullName: text('full_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── AGGREGATOR CONNECTIONS ────────────────────────────────────────

export const aggregatorConnections = pgTable(
  'aggregator_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: aggregatorProviderEnum('provider').notNull(),
    institutionName: text('institution_name').notNull(),
    institutionLogo: text('institution_logo'),
    institutionId: text('institution_id'),
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    itemId: text('item_id'),
    status: connectionStatusEnum('status').notNull().default('pending'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    lastSyncStatus: syncStatusEnum('last_sync_status').notNull().default('idle'),
    lastSyncError: text('last_sync_error'),
    cursor: text('cursor'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('agg_user_idx').on(t.userId),
  }),
);

// ─── ACCOUNTS ───────────────────────────────────────────────────────

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: accountTypeEnum('type').notNull(),
    currency: text('currency').notNull().default('USD'),
    institution: text('institution'),
    last4: text('last4'),
    openingBalance: numeric('opening_balance', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    isActive: boolean('is_active').notNull().default(true),
    isHidden: boolean('is_hidden').notNull().default(false),
    color: text('color'),
    notes: text('notes'),
    connectionId: uuid('connection_id').references(() => aggregatorConnections.id, {
      onDelete: 'set null',
    }),
    externalAccountId: text('external_account_id'),
    externalAccountMask: text('external_account_mask'),
    isAutoSynced: boolean('is_auto_synced').notNull().default(false),
    lastReportedBalance: numeric('last_reported_balance', { precision: 14, scale: 2 }),
    lastBalanceSync: timestamp('last_balance_sync', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('accounts_user_idx').on(t.userId),
  }),
);

// ─── CATEGORIES ─────────────────────────────────────────────────────

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    group: text('group').notNull(),
    kind: categoryKindEnum('kind').notNull(),
    monthlyBudget: numeric('monthly_budget', { precision: 14, scale: 2 }).default('0'),
    color: text('color'),
    icon: text('icon'),
    isArchived: boolean('is_archived').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('categories_user_idx').on(t.userId),
    uniqNamePerUser: uniqueIndex('categories_user_name_unique').on(t.userId, t.name),
  }),
);

// ─── RECURRING TRANSACTIONS ─────────────────────────────────────────

export const recurringTransactions = pgTable(
  'recurring_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    type: transactionTypeEnum('type').notNull(),
    frequency: recurrenceFreqEnum('frequency').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    nextDueDate: date('next_due_date').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    autoPost: boolean('auto_post').notNull().default(false),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('rec_user_idx').on(t.userId),
    nextDueIdx: index('rec_next_due_idx').on(t.nextDueDate),
  }),
);

// ─── TRANSACTIONS ───────────────────────────────────────────────────

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    transferAccountId: uuid('transfer_account_id').references(() => accounts.id, {
      onDelete: 'set null',
    }),
    date: date('date').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    type: transactionTypeEnum('type').notNull(),
    merchant: text('merchant'),
    description: text('description'),
    notes: text('notes'),
    tags: jsonb('tags').$type<string[]>().default([]),
    isCleared: boolean('is_cleared').notNull().default(true),
    recurringId: uuid('recurring_id').references(() => recurringTransactions.id, {
      onDelete: 'set null',
    }),
    externalTransactionId: text('external_transaction_id'),
    syncedFromConnectionId: uuid('synced_from_connection_id').references(
      () => aggregatorConnections.id,
      { onDelete: 'set null' },
    ),
    isManuallyEdited: boolean('is_manually_edited').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('tx_user_idx').on(t.userId),
    dateIdx: index('tx_date_idx').on(t.date),
    catIdx: index('tx_cat_idx').on(t.categoryId),
    acctIdx: index('tx_acct_idx').on(t.accountId),
    userDateIdx: index('tx_user_date_idx').on(t.userId, t.date),
    extIdx: uniqueIndex('tx_user_external_unique').on(t.userId, t.externalTransactionId),
  }),
);

// ─── GOALS ──────────────────────────────────────────────────────────

export const goals = pgTable(
  'goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    targetAmount: numeric('target_amount', { precision: 14, scale: 2 }).notNull(),
    currentAmount: numeric('current_amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    targetDate: date('target_date'),
    priority: integer('priority').notNull().default(0),
    status: goalStatusEnum('status').notNull().default('active'),
    linkedAccountId: uuid('linked_account_id').references(() => accounts.id, {
      onDelete: 'set null',
    }),
    color: text('color'),
    icon: text('icon'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('goals_user_idx').on(t.userId),
  }),
);

export const goalContributions = pgTable('goal_contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── NET WORTH SNAPSHOTS ────────────────────────────────────────────

export const netWorthSnapshots = pgTable(
  'net_worth_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    balance: numeric('balance', { precision: 14, scale: 2 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqDateAcct: uniqueIndex('nw_user_date_acct_unique').on(t.userId, t.date, t.accountId),
  }),
);

// ─── SETTINGS ───────────────────────────────────────────────────────

export const settings = pgTable(
  'settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqUserKey: uniqueIndex('settings_user_key_unique').on(t.userId, t.key),
  }),
);

// ─── HOLDINGS ───────────────────────────────────────────────────────

export const holdings = pgTable(
  'holdings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    symbol: text('symbol').notNull(),
    name: text('name'),
    quantity: numeric('quantity', { precision: 18, scale: 8 }).notNull(),
    costBasis: numeric('cost_basis', { precision: 14, scale: 2 }),
    currentPrice: numeric('current_price', { precision: 14, scale: 4 }),
    marketValue: numeric('market_value', { precision: 14, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    asOfDate: date('as_of_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    acctIdx: index('hold_acct_idx').on(t.accountId),
    symbolIdx: index('hold_symbol_idx').on(t.symbol),
    uniqAcctSymbol: uniqueIndex('hold_acct_symbol_unique').on(t.accountId, t.symbol),
  }),
);

// ─── SYNC LOGS ──────────────────────────────────────────────────────

export const syncLogs = pgTable('sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  connectionId: uuid('connection_id')
    .notNull()
    .references(() => aggregatorConnections.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  status: syncStatusEnum('status').notNull(),
  recordsAdded: integer('records_added').notNull().default(0),
  recordsUpdated: integer('records_updated').notNull().default(0),
  recordsSkipped: integer('records_skipped').notNull().default(0),
  errorMessage: text('error_message'),
  payload: jsonb('payload'),
});

// ─── PLAID CATEGORY MAP ─────────────────────────────────────────────

export const plaidCategoryMap = pgTable(
  'plaid_category_map',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    plaidPrimary: text('plaid_primary').notNull(),
    plaidDetailed: text('plaid_detailed'),
    localCategoryId: uuid('local_category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqUserPlaid: uniqueIndex('pcm_user_plaid_unique').on(
      t.userId,
      t.plaidPrimary,
      t.plaidDetailed,
    ),
  }),
);

// ─── RELATIONS ──────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  categories: many(categories),
  transactions: many(transactions),
  goals: many(goals),
  snapshots: many(netWorthSnapshots),
  recurring: many(recurringTransactions),
  settings: many(settings),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  transactions: many(transactions, { relationName: 'tx_account' }),
  connection: one(aggregatorConnections, {
    fields: [accounts.connectionId],
    references: [aggregatorConnections.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
    relationName: 'tx_account',
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  transferAccount: one(accounts, {
    fields: [transactions.transferAccountId],
    references: [accounts.id],
  }),
  recurring: one(recurringTransactions, {
    fields: [transactions.recurringId],
    references: [recurringTransactions.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
  contributions: many(goalContributions),
  linkedAccount: one(accounts, {
    fields: [goals.linkedAccountId],
    references: [accounts.id],
  }),
}));

export const goalContributionsRelations = relations(goalContributions, ({ one }) => ({
  goal: one(goals, { fields: [goalContributions.goalId], references: [goals.id] }),
}));

export const holdingsRelations = relations(holdings, ({ one }) => ({
  user: one(users, { fields: [holdings.userId], references: [users.id] }),
  account: one(accounts, { fields: [holdings.accountId], references: [accounts.id] }),
}));

export const aggregatorConnectionsRelations = relations(
  aggregatorConnections,
  ({ one, many }) => ({
    user: one(users, { fields: [aggregatorConnections.userId], references: [users.id] }),
    accounts: many(accounts),
  }),
);
