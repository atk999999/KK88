import Dexie, { Table } from 'dexie';
import { GameSession, Turn, RegistryEntry } from './types';

class GameDatabase extends Dexie {
  sessions!: Table<GameSession>;
  turns!: Table<Turn>;
  encyclopedia!: Table<RegistryEntry>;

  constructor() {
    super('ThienDaoDB');
    (this as any).version(4).stores({
      sessions: '++id, createdAt',
      turns: '++id, sessionId, turnIndex, [sessionId+turnIndex]',
      encyclopedia: '++id, sessionId, type, name, [sessionId+name]' 
    });
  }

  /**
   * Optimized batch import for restoring game sessions.
   * Runs inside a single transaction for ACID compliance and speed.
   */
  async importSession(session: GameSession, turns: Turn[], wiki: RegistryEntry[] = []): Promise<number> {
      return (this as any).transaction('rw', this.sessions, this.turns, this.encyclopedia, async () => {
          // 1. Add Session
          const newSessionId = await this.sessions.add({ 
              ...session, 
              id: undefined, 
              createdAt: Date.now() 
          }) as number;

          // 2. Prepare Turns (Update sessionId)
          const turnsWithId = turns.map(t => ({ 
              ...t, 
              id: undefined, 
              sessionId: newSessionId 
          }));
          
          // Bulk Add Turns
          if (turnsWithId.length > 0) {
              await this.turns.bulkAdd(turnsWithId);
          }

          // 3. Prepare Wiki (Update sessionId)
          if (wiki && wiki.length > 0) {
              const wikiWithId = wiki.map(e => ({ 
                  ...e, 
                  id: undefined, 
                  sessionId: newSessionId 
          }));
              await this.encyclopedia.bulkAdd(wikiWithId);
          }

          return newSessionId;
      });
  }

  /**
   * Optimized Wiki Update Logic (Fixed for Redundancy):
   * 1. Deduplicates input candidates.
   * 2. Merges with existing entries intelligently (Append/Update instead of Overwrite).
   * 3. Prevents duplicate storage of identical info.
   */
  async upsertWikiEntries(sessionId: number, candidates: RegistryEntry[]): Promise<void> {
      if (!candidates || candidates.length === 0) return;

      return (this as any).transaction('rw', this.encyclopedia, async () => {
          // 1. Deduplicate candidates internally (Case-insensitive name)
          const uniqueCandidates = new Map<string, RegistryEntry>();
          candidates.forEach(c => {
              if (c.name && c.name.trim()) {
                  const key = c.name.trim().toLowerCase();
                  // If duplicate in batch, prefer the one with longer description
                  if (uniqueCandidates.has(key)) {
                      const existing = uniqueCandidates.get(key)!;
                      if ((c.description?.length || 0) > (existing.description?.length || 0)) {
                          uniqueCandidates.set(key, c);
                      }
                  } else {
                      uniqueCandidates.set(key, c);
                  }
              }
          });

          // Fetch existing entries for this session to check duplicates
          const existingEntries = await this.encyclopedia
              .where('sessionId')
              .equals(sessionId)
              .toArray();

          const entriesToSave: RegistryEntry[] = [];

          for (const newEntry of uniqueCandidates.values()) {
              const normalizedName = newEntry.name.trim().toLowerCase();
              
              // Find duplicate by name (Case-insensitive)
              const existing = existingEntries.find(e => e.name.trim().toLowerCase() === normalizedName);

              if (existing) {
                  // SMART MERGE LOGIC
                  let finalDescription = existing.description || "";
                  const newDesc = newEntry.description?.trim();

                  if (newDesc) {
                       // Check similarity to avoid "repeating"
                       // If existing contains new (subset), do nothing
                       if (finalDescription.includes(newDesc)) {
                           // Keep existing
                       } 
                       // If new contains existing (superset), upgrade
                       else if (newDesc.includes(finalDescription)) {
                           finalDescription = newDesc;
                       }
                       // If mostly different, decide to append or keep longer
                       else {
                           // Simple overlap check (start of string) to detect rewrites
                           // If the first 30 chars are identical, it's likely a rewrite attempt
                           const existingStart = finalDescription.substring(0, 30);
                           const newStart = newDesc.substring(0, 30);

                           if (existingStart && newStart && (finalDescription.includes(newStart) || newDesc.includes(existingStart))) {
                               // Overlap detected -> Keep the longer/more detailed one
                               finalDescription = finalDescription.length > newDesc.length ? finalDescription : newDesc;
                           } else {
                               // Different info -> Append as update
                               // Avoid duplicate appending if the string is already at the end
                               if (!finalDescription.endsWith(newDesc)) {
                                   finalDescription = `${finalDescription}\n\n• ${newDesc}`;
                               }
                           }
                       }
                  }

                  entriesToSave.push({
                      ...existing,
                      description: finalDescription,
                      // Prefer new embedding if provided, else keep old
                      embedding: (newEntry.embedding && newEntry.embedding.length > 0) ? newEntry.embedding : existing.embedding,
                      // Update metadata if new ones are provided
                      status: newEntry.status || existing.status,
                      powerLevel: newEntry.powerLevel || existing.powerLevel,
                      affiliation: newEntry.affiliation || existing.affiliation,
                      appearance: newEntry.appearance || existing.appearance,
                      personality: newEntry.personality || existing.personality,
                      secrets: newEntry.secrets || existing.secrets,
                      // Ensure type doesn't regress
                      type: newEntry.type || existing.type
                  });

              } else {
                  // INSERT NEW
                  entriesToSave.push({
                      ...newEntry,
                      name: newEntry.name.trim(),
                      sessionId: sessionId
                  });
              }
          }

          if (entriesToSave.length > 0) {
              await this.encyclopedia.bulkPut(entriesToSave);
          }
      });
  }
}

export const db = new GameDatabase();

// --- Vector Math Helpers for Client-Side RAG ---

/**
 * Calculates Cosine Similarity between two vectors with safety checks.
 * Returns 0 if vectors are invalid or zero-magnitude to prevent NaN.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
      return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  // Loop unrolling or simple iteration is fine for 768 dims in JS
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0; // Prevent division by zero
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Finds the top K most similar turns.
 * OPTIMIZATION: Adjusted minScore for better Recall.
 */
export async function findRelevantContext(
  sessionId: number, 
  queryVector: number[], 
  maxTurnIndex: number,
  topK: number = 5,
  minScore: number = 0.65 // Lowered slightly from 0.7 to capture more context (Recall over Precision)
): Promise<{ turn: Turn; score: number }[]> {
  if (!queryVector || queryVector.length === 0) return [];

  // Fetch all turns for this session that have an embedding AND are from the past
  const allTurns = await db.turns
    .where('sessionId')
    .equals(sessionId)
    .filter(turn => 
      !!turn.embedding && 
      !!turn.narrative && 
      turn.turnIndex < maxTurnIndex
    )
    .toArray();

  if (allTurns.length === 0) return [];

  // Calculate scores
  const scoredTurns = allTurns.map(turn => ({
    turn,
    score: cosineSimilarity(queryVector, turn.embedding!)
  }));

  // Filter by threshold and Sort descending
  const filteredTurns = scoredTurns
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score);

  // Return top K
  return filteredTurns.slice(0, topK);
}

/**
 * Finds wiki entries using Semantic Search + Keyword Priority.
 * OPTIMIZATION: Strictly prioritizes Exact Matches to the top of the list.
 */
export async function findRelevantWiki(
    sessionId: number, 
    queryVector: number[], 
    text: string, 
    topK: number = 4, 
    minScore: number = 0.65
): Promise<RegistryEntry[]> {
    
    const allEntries = await db.encyclopedia
        .where('sessionId')
        .equals(sessionId)
        .toArray();
    
    if (allEntries.length === 0) return [];

    const lowerText = text.toLowerCase();
    
    // 1. Keyword Matches (High Priority)
    // If the user's text specifically contains the name of an entry, it MUST be included.
    const keywordMatches: RegistryEntry[] = [];
    const keywordIds = new Set<number>();

    allEntries.forEach(entry => {
        // Check if entry name exists in user prompt (e.g. "Ask Xiao Yan" -> matches "Xiao Yan")
        if (lowerText.includes(entry.name.toLowerCase())) {
            keywordMatches.push(entry);
            if (entry.id) keywordIds.add(entry.id);
        }
    });

    // 2. Vector Matches (Semantic Fallback)
    let vectorMatches: { entry: RegistryEntry; score: number }[] = [];
    if (queryVector && queryVector.length > 0) {
        vectorMatches = allEntries
            .filter(e => !!e.embedding && !keywordIds.has(e.id!)) // Exclude already found by keyword
            .map(entry => ({
                entry,
                score: cosineSimilarity(queryVector, entry.embedding!)
            }))
            .filter(item => item.score >= minScore)
            .sort((a, b) => b.score - a.score);
    }

    // 3. Merge: Keyword Matches FIRST, then fill remaining slots with Vector matches
    const finalResults = [...keywordMatches];
    
    // Fill up to topK + buffer using vector matches
    for (const match of vectorMatches) {
        if (finalResults.length >= topK + 2) break; // Hard limit
        finalResults.push(match.entry);
    }

    return finalResults;
}