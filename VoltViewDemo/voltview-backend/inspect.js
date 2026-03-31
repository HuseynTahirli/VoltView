const supabase = require('./supabaseClient');

async function checkThresholds() {
  const { data, error } = await supabase.from('thresholds').select('*');
  console.log("DB Thresholds:", JSON.stringify(data, null, 2));
}
checkThresholds();
