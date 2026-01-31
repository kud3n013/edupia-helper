
import { createClient } from '@supabase/supabase-js';

// Hardcoded from .env.local view
const SUPABASE_URL = 'https://lgbwcgderxlcguvibmmb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Mc2inywUey2vpBgGHBgSFg_2lD4EDbf';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    console.log("Starting test...");

    // 1. Sign Up Temp User
    const email = `debug_${Date.now()}@test.com`;
    const password = 'Password@123';

    console.log(`Creating user: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
    });

    if (authError) {
        console.error("Auth Error:", authError);
        return;
    }

    const userId = authData.user?.id;
    console.log(`User created: ${userId}`);

    if (!userId) {
        console.error("No user ID. Skipping insert.");
        return;
    }

    // 2. Insert Record with 'A'
    console.log("\n--- TEST: Pay Rate 'A' ---");
    const { data: recordA, error: errA } = await supabase
        .from('records')
        .insert({
            user_id: userId,
            class_id: 'TestA-10', // Standard, count=4
            status: 'Hoàn thành',
            pay_rate: 'A',
            date: new Date().toISOString()
        })
        .select()
        .single();

    if (errA) console.error("Insert A Error:", errA);
    else console.log(`Rate for A: ${recordA.rate} (Expected: 95000)`);

    // 3. Insert Record with 'A+'
    console.log("\n--- TEST: Pay Rate 'A+' ---");
    const { data: recordAP, error: errAP } = await supabase
        .from('records')
        .insert({
            user_id: userId,
            class_id: 'TestAP-10',
            status: 'Hoàn thành',
            pay_rate: 'A+',
            date: new Date().toISOString()
        })
        .select()
        .single();

    if (errAP) console.error("Insert A+ Error:", errAP);
    else console.log(`Rate for A+: ${recordAP.rate} (Expected: 100000)`);

    // 4. Insert Record with 'B'
    console.log("\n--- TEST: Pay Rate 'B' ---");
    const { data: recordB, error: errB } = await supabase
        .from('records')
        .insert({
            user_id: userId,
            class_id: 'TestB-10',
            status: 'Hoàn thành',
            pay_rate: 'B',
            date: new Date().toISOString()
        })
        .select()
        .single();

    if (errB) console.error("Insert B Error:", errB);
    else console.log(`Rate for B: ${recordB.rate} (Expected: 75000)`);
}

test();
