const supabase = require('./supabaseClient');

async function testSignup() {
  const { data, error } = await supabase.auth.signUp({
    email: 'jaypatel81999@gmail.com',
    password: 'Password123!'
  });
  if (error) console.error("Error:", error);
  else {
    console.log("Success:", data.user?.email);
    // sync to public users
    await supabase.from('users').insert([{
        id: data.user.id,
        username: data.user.email,
        email: data.user.email
    }]);
  }
}
testSignup();
