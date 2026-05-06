const supabase = require('./supabaseClient');

async function checkReadings() {
  const { data, error } = await supabase
    .from('readings')
    .select('*')
    .order('id', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Recent Readings:", JSON.stringify(data, null, 2));
  }
}
checkReadings();
