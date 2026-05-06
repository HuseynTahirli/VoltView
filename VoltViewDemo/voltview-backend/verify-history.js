const supabase = require('./supabaseClient');

async function checkMarch31() {
  const { data, error } = await supabase
    .from('readings')
    .select('*')
    .gte('timestamp', '2026-03-31T00:00:00Z')
    .lte('timestamp', '2026-04-01T23:59:59Z')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log(`Found ${data.length} readings between March 31 and April 1.`);
    console.log("Samples:", JSON.stringify(data.slice(0, 5), null, 2));
  }
}
checkMarch31();
