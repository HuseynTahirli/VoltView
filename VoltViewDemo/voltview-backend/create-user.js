const supabase = require('./supabaseClient');
const bcrypt = require('bcrypt');

async function createDemoUser() {
    const username = 'demo';
    const password = 'password123';
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    console.log(`Creating user: ${username}`);

    const { data, error } = await supabase
        .from('users')
        .insert([
            { username: username, password_hash: hash }
        ])
        .select();

    if (error) {
        if (error.code === '23505') {
            console.log('User already exists.');
        } else {
            console.error('Error creating user:', error);
        }
    } else {
        console.log('User created successfully:', data);
    }
}

createDemoUser().then(() => process.exit());
