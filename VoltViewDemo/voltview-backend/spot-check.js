const supabase = require('./supabaseClient');

async function findMidpoint() {
  const { data, error } = await supabase
    .from('readings')
    .select('id, timestamp')
    .in('id', [2, 100, 200, 300, 399])
    .order('id', { ascending: true });

  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Spot Check Results:");
    console.log(JSON.stringify(data, null, 2));
  }
}
findMidpoint();
