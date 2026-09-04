import User from "../models/User.js";

/**
 * Email verification is a new requirement being added to an app that
 * already has real users. Mongoose's schema `default: false` for
 * `emailVerified` would otherwise apply to every existing account the
 * moment it's next read (since the field is genuinely absent from their
 * documents in the database), silently locking every current user out at
 * their next login — that's exactly the kind of accidental breakage this
 * migration exists to prevent.
 *
 * This grandfathers in every account that predates this feature (i.e. any
 * document where the field doesn't exist in the database at all) as
 * verified, without touching accounts created after this shipped (which
 * always have the field set explicitly at creation time, so they never
 * match `$exists: false`). Safe to run on every server start — it only
 * ever affects genuinely legacy documents, so it's a no-op once the
 * one-time backfill has happened.
 */
export const migrateExistingUsersAsVerified = async () => {
  const result = await User.updateMany(
    { emailVerified: { $exists: false } },
    { $set: { emailVerified: true } }
  );

  if (result.modifiedCount > 0) {
    console.log(
      `Email verification migration: grandfathered ${result.modifiedCount} pre-existing account(s) as verified.`
    );
  }
};
