-- Run once if upgrading from old HubEventType values (general, birthday, etc.)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'HubEventType' AND e.enumlabel = 'general'
  ) THEN
    CREATE TYPE "HubEventType_new" AS ENUM (
      'social', 'corporate', 'cultural', 'entertainment', 'sports',
      'educational', 'technological', 'charitable', 'religious', 'other'
    );
    ALTER TABLE "events" ALTER COLUMN "type" DROP DEFAULT;
    ALTER TABLE "events" ALTER COLUMN "type" TYPE "HubEventType_new" USING (
      CASE "type"::text
        WHEN 'social' THEN 'social'::"HubEventType_new"
        WHEN 'celebration' THEN 'entertainment'::"HubEventType_new"
        WHEN 'meeting' THEN 'corporate'::"HubEventType_new"
        WHEN 'trip' THEN 'cultural'::"HubEventType_new"
        WHEN 'birthday' THEN 'social'::"HubEventType_new"
        ELSE 'other'::"HubEventType_new"
      END
    );
    DROP TYPE "HubEventType";
    ALTER TYPE "HubEventType_new" RENAME TO "HubEventType";
    ALTER TABLE "events" ALTER COLUMN "type" SET DEFAULT 'social';
  END IF;
END $$;
