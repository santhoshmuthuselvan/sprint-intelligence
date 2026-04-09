import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
    supabaseUrl,
    supabaseKey
);

/**
 * Utility to fetch all records from a Supabase query by handling pagination automatically.
 * Supabase/PostgREST has a default limit of 1000 records.
 */
export async function fetchAll<T = any>(
    queryBuilder: any,
    batchSize: number = 1000
): Promise<T[]> {
    let allData: T[] = [];
    let from = 0;
    let finished = false;

    while (!finished) {
        const { data, error } = await queryBuilder.range(from, from + batchSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            allData = [...allData, ...data];
            if (data.length < batchSize) {
                finished = true;
            } else {
                from += batchSize;
            }
        } else {
            finished = true;
        }
    }

    return allData;
}
