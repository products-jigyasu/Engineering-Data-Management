/**
 * Sync Script: Google Sheets -> Supabase Experiments
 * 
 * Usage: npx tsx scripts/sync-google-sheets.ts
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const googleApiKey = process.env.GOOGLE_SHEETS_API_KEY!;
const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

if (!supabaseUrl || !serviceRoleKey || !googleApiKey || !spreadsheetId) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const sheets = google.sheets({ version: 'v4', auth: googleApiKey });

async function syncSheets() {
  console.log('🔄 Starting Google Sheets sync...\n');

  try {
    // 1. Fetch metadata to get the first sheet name
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title;

    if (!sheetName) {
      throw new Error('Could not find any sheets in the spreadsheet');
    }

    console.log(`📊 Reading from sheet: "${sheetName}"`);

    // 2. Fetch all values
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:Z1000`, // Assume up to 1000 rows, columns A-Z
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      console.log('⚠️  No data found in sheet.');
      return;
    }

    // 3. Map headers
    const headers = rows[0];
    const headerMap = {
      sl: headers.findIndex(h => h.toLowerCase().includes('sl')),
      name: headers.findIndex(h => h.toLowerCase().includes('activity') || h.toLowerCase().includes('experiment')),
      grade: headers.findIndex(h => h.toLowerCase().includes('grade')),
    };

    console.log(`🗺️  Mapping: SL=${headerMap.sl}, Name=${headerMap.name}, Grade=${headerMap.grade}`);

    if (headerMap.name === -1) {
      throw new Error('Could not find "Activity Name" or "Experiment Name" column');
    }

    const experimentsToSync = [];

    // 4. Process rows
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const slNo = row[headerMap.sl] ? parseInt(row[headerMap.sl]) : null;
        const name = row[headerMap.name];
        const grade = row[headerMap.grade] || 'N/A';

        if (!name || name.trim() === '') continue;

        experimentsToSync.push({
            sl_no: slNo,
            name: name.trim(),
            grade: grade.trim(),
            stage: 'Not Assigned', // Start state
            priority: 'Medium',     // Default priority
        });
    }

    console.log(`📝 Prepared ${experimentsToSync.length} experiments for sync.`);

    // 5. Deduplicate by name before upsert
    const uniqueExps = Array.from(
      new Map(experimentsToSync.map((item) => [item.name, item]) ).values()
    );

    console.log(`✨ Deduplicated to ${uniqueExps.length} unique experiments.`);

    // 6. Upsert into Supabase
    const { error: syncError } = await supabase
        .from('experiments')
        .upsert(uniqueExps, { onConflict: 'name' });

    if (syncError) {
        console.error('❌ Sync error:', syncError.message);
    } else {
        console.log('✅ Successfully synced experiments to Supabase!');
    }

  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
  }
}

syncSheets();
