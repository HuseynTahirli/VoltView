const supabase = require('./supabaseClient');

async function forceConfirm() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) { console.error("List users error:", error); return; }
  
  const user = users.find(u => u.email === 'jaypatel81999@gmail.com');
  if (user) {
    console.log("Found user:", user.id, "Confirmed:", !!user.email_confirmed_at);
    if (!user.email_confirmed_at) {
        // Try to update the user to confirmed
        const { data, error: updateErr } = await supabase.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );
        if (updateErr) console.error("Update err:", updateErr);
        else console.log("Force confirmed user!");
    } else {
        console.log("User already confirmed.");
        
        // If confirmed but password fails, let's force update password just in case
        const { error: pwErr } = await supabase.auth.admin.updateUserById(
          user.id,
          { password: 'Password123!' }
        );
        if (pwErr) console.log("PW Update Err:", pwErr);
        else console.log("Force updated password to Password123!");
    }
  } else {
    console.log("User not found.");
  }
}
forceConfirm();
