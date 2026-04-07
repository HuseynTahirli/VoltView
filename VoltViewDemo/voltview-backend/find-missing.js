const supabase = require('./supabaseClient');

async function checkRange() {
  const { data, error } = await supabase
    .from('readings')
    .select('id, timestamp')
    .gte('id', 400)
    .lte('id', 495)
    .order('id', { ascending: false });

  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Readings IDs 400 to 495:");
    console.log(JSON.stringify(data, null, 2));
  }
}
checkRange();
