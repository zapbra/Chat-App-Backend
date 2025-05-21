import { timestamp } from "drizzle-orm/pg-core";

const timestamps = {
  updated_at: timestamp()
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  created_at: timestamp().defaultNow().notNull(),
  deleted_at: timestamp(),
};

export default timestamps;
