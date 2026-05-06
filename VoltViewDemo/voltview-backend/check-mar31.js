const supabase = require('./supabaseClient');

async function checkOnlyMarch31() {
  const { data, error } = await supabase
    .from('readings')
    .select('*')
    .gte('timestamp', '2026-03-31T00:00:00Z')
    .lte('timestamp', '2026-03-31T23:59:59Z')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log(`Found ${data.length} readings on March 31 (UTC).`);
    if (data.length > 0) {
      console.log("Latest on March 31:", JSON.stringify(data.slice(0, 3), null, 2));
      console.log("Earliest on March 31:", JSON.stringify(data.slice(-3), null, 2));
    }
  }
}
checkOnlyMarch31();
