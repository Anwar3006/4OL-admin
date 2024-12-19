
app.get('/api/check-super-admin', async (req, res) => {
  try {
    // Query to check if Super Admin exists
    const { data, error } = await supabase
      .from('user_profiles')  // Assuming 'users' table contains user roles
      .select('*')
      .eq('role', 'Super Admin') // Filter by Super Admin role
      .single(); // Assuming only one Super Admin

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    // If data is found, return that a Super Admin exists
    res.json({ exists: !!data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
