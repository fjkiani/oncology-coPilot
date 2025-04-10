import { db } from './db';
import { Records, Users } from './schema';
import { sql } from 'sql-template-strings';

export async function createRecord({
  userId,
  recordName,
  analysisResult,
  kanbanRecords,
  createdBy
}) {
  try {
    // First verify the user exists
    const user = await db.select().from(Users).where(sql`id = ${userId}`).limit(1);
    
    if (!user.length) {
      throw new Error('User not found');
    }

    // Create the record
    const result = await db
      .insert(Records)
      .values({
        userId,
        recordName,
        analysisResult,
        kanbanRecords,
        createdBy
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error creating record:', error);
    throw error;
  }
}

// Get records for a user
export async function getUserRecords(userId) {
  try {
    const records = await db
      .select()
      .from(Records)
      .where(sql`user_id = ${userId}`);
    return records;
  } catch (error) {
    console.error('Error fetching user records:', error);
    throw error;
  }
}

// Update a record
export async function updateRecord(recordId, updateData) {
  try {
    const result = await db
      .update(Records)
      .set(updateData)
      .where(sql`id = ${recordId}`)
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error updating record:', error);
    throw error;
  }
} 